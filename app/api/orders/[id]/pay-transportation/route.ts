import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { QTY_EPS, roundQty, sameQty } from "@/lib/quantity";
import { getCashBalance } from "@/lib/balance";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { cost, value, containers } = body;
    const orderId = parseInt(params.id);

    if (
      !(Number.isFinite(cost) && cost > 0) ||
      !(Number.isFinite(value) && value > 0)
    ) {
      return NextResponse.json(
        { error: "Стоимость и объем транспортировки должны быть больше 0" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует и ожидает оплаты транспорта
    // (после создания контейнера заказ получает статус "in_container")
    const order = db
      .prepare(
        "SELECT * FROM orders WHERE id = ? AND status IN ('paid', 'in_container')"
      )
      .get(orderId) as any;
    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден или уже обработан" },
        { status: 404 }
      );
    }

    if (value > order.value + QTY_EPS) {
      return NextResponse.json(
        { error: "Объем транспортировки не может превышать объем заказа" },
        { status: 400 }
      );
    }

    // Баланс кассы без долга менеджеров (см. lib/balance.ts)
    const currentBalance = getCashBalance();

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
        VALUES (?, ?, 'transportation', ?)
      `);
      insertExpense.run(
        cost,
        `Транспортировка заказа ${order.order_number}`,
        orderId
      );

      if (sameQty(value, order.value)) {
        // Полная оплата транспорта - обновляем весь заказ
        const update = db.prepare(`
          UPDATE orders 
          SET transportation_cost = COALESCE(transportation_cost, 0) + ?, 
              total_price = COALESCE(total_price, 0) + ?,
              status = 'on_way'
          WHERE id = ?
        `);
        update.run(cost, cost, orderId);

        // Логируем активность
        logActivity(session.userId, "оплата_транспорта_полная", "order", `Заказ ${order.order_number}: полная оплата транспортировки $${cost} для ${value} ${order.measurement}`);
      } else {
        // Частичная оплата - разделяем заказ
        const remainingValue = roundQty(order.value - value);
        const pricePerUnit = order.total_price / order.value;
        
        // Создаем новый заказ для оплаченной части (в пути)
        const newOrderNumber = `${order.order_number}-T${Math.floor(Date.now() / 1000)}`;
        const newOrderPrice = value * pricePerUnit;
        
        const insertNewOrder = db.prepare(`
          INSERT INTO orders (
            order_number, supplier_id, item_id, date, description, measurement,
            value, price_per_unit, total_price, status, containers, 
            transportation_cost, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'on_way', ?, ?, datetime('now'))
        `);
        
        insertNewOrder.run(
          newOrderNumber,
          order.supplier_id,
          order.item_id,
          order.date,
          `Транспортировка из ${order.order_number}`,
          order.measurement,
          value,
          order.price_per_unit,
          newOrderPrice + cost,
          1,
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
        logActivity(session.userId, "оплата_транспорта_частичная", "order", `Заказ ${order.order_number}: частичная оплата транспортировки $${cost} для ${value} ${order.measurement}. Создан новый заказ ${newOrderNumber} (в пути). Остаток: ${remainingValue} ${order.measurement}`);
      }
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
