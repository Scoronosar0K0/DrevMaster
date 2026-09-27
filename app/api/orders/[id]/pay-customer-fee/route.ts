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
    const { cost, value } = body;
    const orderId = parseInt(params.id);

    if (!(Number.isFinite(cost) && cost > 0)) {
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

    // Если указан объем, проверяем его: отрицательный или нулевой объем
    // создал бы «лишний» товар на складе
    if (
      value !== undefined &&
      value !== null &&
      !(typeof value === "number" && Number.isFinite(value) && value > 0)
    ) {
      return NextResponse.json(
        { error: "Объем таможенного оформления должен быть больше 0" },
        { status: 400 }
      );
    }
    const customsValue: number = value ?? order.value;
    if (customsValue > order.value + QTY_EPS) {
      return NextResponse.json(
        { error: "Объем таможенного оформления не может превышать объем заказа" },
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
        VALUES (?, ?, 'customs', ?)
      `);
      insertExpense.run(
        cost,
        `Таможенный сбор за заказ ${order.order_number}`,
        orderId
      );

      if (sameQty(customsValue, order.value)) {
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
        logActivity(session.userId, "оплата_таможни_полная", "order", `Заказ ${order.order_number}: полная оплата таможни $${cost} для ${customsValue} ${order.measurement}`);
      } else {
        // Частичная оплата - разделяем заказ
        const remainingValue = roundQty(order.value - customsValue);
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
        logActivity(session.userId, "оплата_таможни_частичная", "order", `Заказ ${order.order_number}: частичная оплата таможни $${cost} для ${customsValue} ${order.measurement}. Создан новый заказ ${newOrderNumber} (на складе). Остаток: ${remainingValue} ${order.measurement}`);
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
