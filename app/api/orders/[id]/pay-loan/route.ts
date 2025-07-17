import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { containers, totalCost } = body;
    const orderId = parseInt(params.id);

    if (
      !containers ||
      containers.length === 0 ||
      !totalCost ||
      totalCost <= 0
    ) {
      return NextResponse.json(
        { error: "Контейнеры и общая стоимость должны быть указаны" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует и имеет статус "loan"
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND status = ?")
      .get(orderId, "loan") as any;
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

    if (totalCost > currentBalance) {
      return NextResponse.json(
        {
          error: `Недостаточно средств! Необходимо: $${totalCost.toFixed(
            2
          )}, Доступно: $${currentBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Добавляем расход для оплаты займа
      const insertExpense = db.prepare(`
        INSERT INTO expenses (amount, description, type, related_id)
        VALUES (?, ?, 'order', ?)
      `);
      insertExpense.run(
        totalCost,
        `Оплата займа за заказ ${order.order_number}`,
        orderId
      );

      // Обновляем заказ со статусом "paid" и добавляем информацию о контейнерах
      const update = db.prepare(`
        UPDATE orders 
        SET status = 'paid', 
            total_price = ?,
            container_loads = ?
        WHERE id = ?
      `);

      // Создаем данные контейнеров для сохранения
      const containerData = containers.map((container: any) => ({
        container: container.container,
        value: container.value,
        cost: container.cost,
        description: container.description,
        measurement: order.measurement,
      }));

      update.run(totalCost, JSON.stringify(containerData), orderId);

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'оплата_займа', 'order', ?)
      `);
      insertLog.run(
        `Заказ ${order.order_number}: оплата займа на сумму $${totalCost}. Контейнеров: ${containers.length}`
      );
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка оплаты займа:", error);
    return NextResponse.json({ error: "Ошибка оплаты займа" }, { status: 500 });
  }
}
