import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { cost } = body;
    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    if (!cost || cost <= 0) {
      return NextResponse.json(
        { error: "Стоимость таможенного сбора должна быть больше 0" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует и имеет статус "on_way"
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND status = ?")
      .get(orderId, "on_way") as any;
    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден или имеет неверный статус" },
        { status: 404 }
      );
    }

    // Проверяем баланс
    const loansResult = db
      .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
      .get() as { total: number | null };
    const totalLoans = loansResult.total || 0;

    const expensesResult = db
      .prepare("SELECT SUM(amount) as total FROM expenses")
      .get() as { total: number | null };
    const totalExpenses = expensesResult.total || 0;

    const currentBalance = totalLoans - totalExpenses;

    if (cost > currentBalance) {
      return NextResponse.json(
        {
          error: `Недостаточно средств! Необходимо: $${cost.toFixed(
            2
          )}, Доступно: $${currentBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Добавляем расход вместо изменения займов
      const insertExpense = db.prepare(`
        INSERT INTO expenses (amount, description, type, related_id)
        VALUES (?, ?, 'customs', ?)
      `);
      insertExpense.run(
        cost,
        `Таможенный сбор за заказ ${order.order_number}`,
        orderId
      );

      // Обновляем заказ
      const update = db.prepare(`
        UPDATE orders 
        SET customer_fee = ?, 
            total_price = COALESCE(total_price, 0) + ?,
            status = 'warehouse'
        WHERE id = ?
      `);

      update.run(cost, cost, orderId);

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'оплата_таможни', 'order', ?)
      `);
      insertLog.run(
        `Заказ ${order.order_number}: оплачен таможенный сбор $${cost}`
      );
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка оплаты таможенного сбора:", error);
    return NextResponse.json(
      { error: "Ошибка оплаты таможенного сбора" },
      { status: 500 }
    );
  }
}
