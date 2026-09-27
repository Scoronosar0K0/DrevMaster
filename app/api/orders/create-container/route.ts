import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { QTY_EPS, roundQty, sameQty } from "@/lib/quantity";

initDatabase();

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { order_id, volume, description } = body;

    if (!order_id || !(Number.isFinite(volume) && volume > 0)) {
      return NextResponse.json(
        { error: "ID заказа и объем обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует.
    // Нужны все поля: при частичной загрузке они копируются в новый заказ
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(order_id) as any;

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    // В контейнер грузят только оплаченный заказ. Неоплаченный (в займе)
    // сначала оплачивают, а заказ, уже отправленный дальше, не возвращают назад
    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Контейнер можно создать только для оплаченного заказа" },
        { status: 400 }
      );
    }

    // У оплаченного заказа container_loads описывает только планируемые или
    // оплаченные контейнеры (например, после оплаты займа), а не загруженный
    // объем — поэтому доступен весь объем заказа
    const remainingVolume = order.value;

    if (volume > remainingVolume + QTY_EPS) {
      return NextResponse.json(
        {
          error: `Объем контейнера (${volume}) превышает оставшийся объем заказа (${remainingVolume})`,
        },
        { status: 400 }
      );
    }
    const isFull = sameQty(volume, order.value);

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      if (isFull) {
        // Полная загрузка - обновляем весь заказ
        const newContainer = {
          container: 1,
          value: order.value,
          description: description || `Контейнер 1`,
        };

        const updateOrder = db.prepare(`
          UPDATE orders 
          SET containers = 1, container_loads = ?, status = 'in_container'
          WHERE id = ?
        `);
        updateOrder.run(JSON.stringify([newContainer]), order_id);

        // Логируем активность
        logActivity(session.userId, "создание_контейнера_полная", "order", `Создан контейнер для всего объема заказа ${order.order_number}: ${volume} ${order.measurement}${description ? ` (${description})` : ''}`);
      } else {
        // Частичная загрузка - разделяем заказ
        const remainingVolume = roundQty(order.value - volume);
        const pricePerUnit = order.total_price / order.value;
        
        // Создаем новый заказ для контейнера
        const containerOrderNumber = `${order.order_number}-C${Math.floor(Date.now() / 1000)}`;
        const containerOrderPrice = volume * pricePerUnit;
        
        const insertContainerOrder = db.prepare(`
          INSERT INTO orders (
            order_number, supplier_id, item_id, date, description, measurement,
            value, price_per_unit, total_price, status, containers, 
            container_loads, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_container', 1, ?, datetime('now'))
        `);
        
        const containerData = JSON.stringify([{
          container: 1,
          value: volume,
          description: description || `Контейнер 1`,
        }]);
        
        insertContainerOrder.run(
          containerOrderNumber,
          order.supplier_id,
          order.item_id,
          order.date,
          `Контейнер из ${order.order_number}`,
          order.measurement,
          volume,
          order.price_per_unit,
          containerOrderPrice,
          containerData
        );

        // Обновляем исходный заказ (убираем загруженный объем)
        const remainingPrice = remainingVolume * pricePerUnit;
        const updateOriginalOrder = db.prepare(`
          UPDATE orders 
          SET value = ?, total_price = ?
          WHERE id = ?
        `);
        updateOriginalOrder.run(remainingVolume, remainingPrice, order_id);

        // Логируем активность
        logActivity(session.userId, "создание_контейнера_частичная", "order", `Создан контейнер для части заказа ${order.order_number}: ${volume} ${order.measurement} → новый заказ ${containerOrderNumber} (в контейнере). Остаток: ${remainingVolume} ${order.measurement}`);
      }
    });

    transaction();

    return NextResponse.json({
      success: true,
      message: isFull ? 
        "Контейнер создан для всего заказа" : 
        "Заказ разделен: создан контейнер и остался заказ для оставшегося объема",
      split: !isFull,
      remaining_volume: isFull ? 0 : roundQty(order.value - volume)
    });
  } catch (error) {
    console.error("Ошибка создания контейнера:", error);
    return NextResponse.json(
      { error: "Ошибка создания контейнера" },
      { status: 500 }
    );
  }
}
