import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    if (!orderId) {
      return NextResponse.json(
        { error: "ID заказа обязателен" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as any;

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    // Получаем все операции из activity_logs связанные с этим заказом
    const activityLogs = db
      .prepare(
        `
        SELECT 
          action,
          details,
          created_at,
          NULL as amount
        FROM activity_logs 
        WHERE (entity_type = 'order' AND details LIKE ?) 
        OR (entity_type IN ('loan', 'expense') AND details LIKE ?)
        ORDER BY created_at ASC
      `
      )
      .all(`%${order.order_number}%`, `%${order.order_number}%`) as any[];

    // Получаем расходы связанные с заказом
    const expenses = db
      .prepare(
        `
        SELECT 
          'создание_расхода' as action,
          description as details,
          created_at,
          amount
        FROM expenses 
        WHERE related_id = ? AND type = 'order'
        ORDER BY created_at ASC
      `
      )
      .all(orderId) as any[];

    // Получаем транспортные расходы
    const transportationExpenses = db
      .prepare(
        `
        SELECT 
          'оплата_транспорта' as action,
          description as details,
          created_at,
          amount
        FROM expenses 
        WHERE related_id = ? AND type = 'transportation'
        ORDER BY created_at ASC
      `
      )
      .all(orderId) as any[];

    // Получаем таможенные расходы
    const customsExpenses = db
      .prepare(
        `
        SELECT 
          'оплата_таможни' as action,
          description as details,
          created_at,
          amount
        FROM expenses 
        WHERE related_id = ? AND type = 'customs'
        ORDER BY created_at ASC
      `
      )
      .all(orderId) as any[];

    // Объединяем все операции
    const allOperations = [
      ...activityLogs,
      ...expenses,
      ...transportationExpenses,
      ...customsExpenses,
    ];

    // Сортируем по дате
    allOperations.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json(allOperations);
  } catch (error) {
    console.error("Ошибка получения операций заказа:", error);
    return NextResponse.json(
      { error: "Ошибка получения операций заказа" },
      { status: 500 }
    );
  }
}
