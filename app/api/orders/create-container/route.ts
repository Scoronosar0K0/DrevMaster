import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, volume, description } = body;

    if (!order_id || !volume || volume <= 0) {
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

    // Проверяем, не превышает ли объем контейнера общий объем заказа
    let existingContainers: any[] = [];
    if (order.container_loads) {
      try {
        existingContainers = JSON.parse(order.container_loads);
      } catch (e) {
        existingContainers = [];
      }
    }

    const existingVolume = existingContainers.reduce(
      (sum, container) => sum + (container.value || 0),
      0
    );
    const remainingVolume = order.value - existingVolume;

    if (volume > remainingVolume) {
      return NextResponse.json(
        {
          error: `Объем контейнера (${volume}) превышает оставшийся объем заказа (${remainingVolume})`,
        },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      if (volume === order.value) {
        // Полная загрузка - обновляем весь заказ
        const newContainer = {
          container: 1,
          value: volume,
          description: description || `Контейнер 1`,
        };

        const updateOrder = db.prepare(`
          UPDATE orders 
          SET containers = 1, container_loads = ?, status = 'in_container'
          WHERE id = ?
        `);
        updateOrder.run(JSON.stringify([newContainer]), order_id);

        // Логируем активность
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'создание_контейнера_полная', 'order', ?)
        `);
        insertLog.run(
          `Создан контейнер для всего объема заказа ${order.order_number}: ${volume} ${order.measurement}${description ? ` (${description})` : ''}`
        );
      } else {
        // Частичная загрузка - разделяем заказ
        const remainingVolume = order.value - volume;
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
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'создание_контейнера_частичная', 'order', ?)
        `);
        insertLog.run(
          `Создан контейнер для части заказа ${order.order_number}: ${volume} ${order.measurement} → новый заказ ${containerOrderNumber} (в контейнере). Остаток: ${remainingVolume} ${order.measurement}`
        );
      }
    });

    transaction();

    return NextResponse.json({
      success: true,
      message: volume === order.value ? 
        "Контейнер создан для всего заказа" : 
        "Заказ разделен: создан контейнер и остался заказ для оставшегося объема",
      split: volume < order.value,
      remaining_volume: volume < order.value ? order.value - volume : 0
    });
  } catch (error) {
    console.error("Ошибка создания контейнера:", error);
    return NextResponse.json(
      { error: "Ошибка создания контейнера" },
      { status: 500 }
    );
  }
}
