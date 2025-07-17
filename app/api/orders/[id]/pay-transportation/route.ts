import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { cost, value, containers } = body;
    const orderId = parseInt(params.id);

    if (!cost || cost <= 0 || !value || value <= 0) {
      return NextResponse.json(
        { error: "Стоимость и объем транспортировки должны быть больше 0" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует и имеет статус "paid"
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND status = ?")
      .get(orderId, "paid") as any;
    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден или уже обработан" },
        { status: 404 }
      );
    }

    if (value > order.value) {
      return NextResponse.json(
        { error: "Объем транспортировки не может превышать объем заказа" },
        { status: 400 }
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
        VALUES (?, ?, 'transportation', ?)
      `);
      insertExpense.run(
        cost,
        `Транспортировка заказа ${order.order_number}`,
        orderId
      );

      // Создаем новый контейнер для отправки
      const containerData = {
        value: value,
        description: `Контейнер для заказа ${order.order_number}`,
        measurement: order.measurement,
        item_name: `Доставка: ${order.order_number}`,
        cost: cost,
        status: "on_way",
      };

      // Если у заказа есть container_loads, добавляем новый контейнер
      let containerLoads = [];
      if (order.container_loads) {
        containerLoads = JSON.parse(order.container_loads);
      }
      containerLoads.push(containerData);

      // Обновляем заказ со статусом "в пути"
      const update = db.prepare(`
        UPDATE orders 
        SET transportation_cost = COALESCE(transportation_cost, 0) + ?, 
            total_price = COALESCE(total_price, 0) + ?,
            status = 'on_way',
            container_loads = ?
        WHERE id = ?
      `);
      update.run(cost, cost, JSON.stringify(containerLoads), orderId);

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'оплата_транспорта', 'order', ?)
      `);
      insertLog.run(
        `Заказ ${order.order_number}: оплата транспортировки $${cost} для ${value} ${order.measurement}. Создан контейнер.`
      );
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка оплаты транспортировки:", error);
    return NextResponse.json(
      { error: "Ошибка оплаты транспортировки" },
      { status: 500 }
    );
  }
}
