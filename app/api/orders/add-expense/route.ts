import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, amount, description } = body;

    if (!order_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "ID заказа и сумма обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует
    const order = db
      .prepare("SELECT id, order_number, total_price FROM orders WHERE id = ?")
      .get(order_id) as any;

    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Добавляем расход
      const insertExpense = db.prepare(`
        INSERT INTO expenses (amount, description, type, order_id, created_at)
        VALUES (?, ?, 'operational', ?, datetime('now'))
      `);
      insertExpense.run(amount, description || `Операционный расход для заказа ${order.order_number}`, order_id);

      // Увеличиваем общую стоимость заказа
      const updateOrder = db.prepare(`
        UPDATE orders 
        SET total_price = COALESCE(total_price, 0) + ?
        WHERE id = ?
      `);
      updateOrder.run(amount, order_id);

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'увеличение_цены_заказа', 'order', ?)
      `);
      insertLog.run(
        `Добавлен операционный расход $${amount} к заказу ${order.order_number}${description ? `: ${description}` : ''}`
      );
    });

    transaction();

    return NextResponse.json({ 
      success: true,
      message: "Операционный расход добавлен и стоимость заказа увеличена"
    });
  } catch (error) {
    console.error("Ошибка добавления операционного расхода:", error);
    return NextResponse.json(
      { error: "Ошибка добавления операционного расхода" },
      { status: 500 }
    );
  }
}
