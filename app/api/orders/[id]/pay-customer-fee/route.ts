import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { cost, value } = body;
    const orderId = parseInt(params.id);

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

    // Если указан объем, проверяем его
    const customsValue = value || order.value;
    if (customsValue > order.value) {
      return NextResponse.json(
        { error: "Объем таможенного оформления не может превышать объем заказа" },
        { status: 400 }
      );
    }

    // Проверяем баланс
    const loansResult = db
      .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
      .get() as { total: number | null };
    const totalLoans = loansResult.total || 0;

    const expensesResult = db
      .prepare("SELECT SUM(amount) as total FROM expenses WHERE amount > 0")
      .get() as { total: number | null };
    const totalExpenses = expensesResult.total || 0;

    const incomeResult = db
      .prepare("SELECT SUM(ABS(amount)) as total FROM expenses WHERE amount < 0")
      .get() as { total: number | null };
    const totalIncome = incomeResult.total || 0;

    const currentBalance = totalLoans + totalIncome - totalExpenses;

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
      // Добавляем расход
      const insertExpense = db.prepare(`
        INSERT INTO expenses (amount, description, type, related_id)
        VALUES (?, ?, 'customs', ?)
      `);
      insertExpense.run(
        cost,
        `Таможенный сбор за заказ ${order.order_number}`,
        orderId
      );

      if (customsValue === order.value) {
        // Полная оплата таможни - обновляем весь заказ
        const update = db.prepare(`
          UPDATE orders 
          SET customer_fee = COALESCE(customer_fee, 0) + ?, 
              total_price = COALESCE(total_price, 0) + ?,
              status = 'warehouse'
          WHERE id = ?
        `);
        update.run(cost, cost, orderId);

        // Логируем активность
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'оплата_таможни_полная', 'order', ?)
        `);
        insertLog.run(
          `Заказ ${order.order_number}: полная оплата таможни $${cost} для ${customsValue} ${order.measurement}`
        );
      } else {
        // Частичная оплата - разделяем заказ
        const remainingValue = order.value - customsValue;
        const pricePerUnit = order.total_price / order.value;
        
        // Создаем новый заказ для оплаченной части (на складе)
        const newOrderNumber = `${order.order_number}-C${Math.floor(Date.now() / 1000)}`;
        const newOrderPrice = customsValue * pricePerUnit;
        
        const insertNewOrder = db.prepare(`
          INSERT INTO orders (
            order_number, supplier_id, item_id, date, description, measurement,
            value, price_per_unit, total_price, status, containers, 
            transportation_cost, customer_fee, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'warehouse', ?, ?, ?, datetime('now'))
        `);
        
        insertNewOrder.run(
          newOrderNumber,
          order.supplier_id,
          order.item_id,
          order.date,
          `Таможня из ${order.order_number}`,
          order.measurement,
          customsValue,
          order.price_per_unit,
          newOrderPrice + cost,
          1,
          order.transportation_cost || 0,
          cost
        );

        // Обновляем исходный заказ (убираем оплаченный объем)
        const remainingPrice = remainingValue * pricePerUnit;
        const updateOriginalOrder = db.prepare(`
          UPDATE orders 
          SET value = ?, total_price = ?
          WHERE id = ?
        `);
        updateOriginalOrder.run(remainingValue, remainingPrice, orderId);

        // Логируем активность
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'оплата_таможни_частичная', 'order', ?)
        `);
        insertLog.run(
          `Заказ ${order.order_number}: частичная оплата таможни $${cost} для ${customsValue} ${order.measurement}. Создан новый заказ ${newOrderNumber} (на складе). Остаток: ${remainingValue} ${order.measurement}`
        );
      }
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
