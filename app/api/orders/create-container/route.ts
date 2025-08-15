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

    // Проверяем, что заказ существует
    const order = db
      .prepare("SELECT id, order_number, value, measurement, container_loads FROM orders WHERE id = ?")
      .get(order_id) as any;

    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 }
      );
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

    const existingVolume = existingContainers.reduce((sum, container) => sum + (container.value || 0), 0);
    const remainingVolume = order.value - existingVolume;

    if (volume > remainingVolume) {
      return NextResponse.json(
        { error: `Объем контейнера (${volume}) превышает оставшийся объем заказа (${remainingVolume})` },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Создаем новый контейнер
      const newContainerNumber = existingContainers.length + 1;
      const newContainer = {
        container: newContainerNumber,
        value: volume,
        description: description || `Контейнер ${newContainerNumber}`,
      };

      // Добавляем новый контейнер к существующим
      const updatedContainers = [...existingContainers, newContainer];

      // Обновляем заказ и меняем статус на in_container
      const updateOrder = db.prepare(`
        UPDATE orders 
        SET containers = ?, container_loads = ?, status = 'in_container'
        WHERE id = ?
      `);
      updateOrder.run(
        updatedContainers.length,
        JSON.stringify(updatedContainers),
        order_id
      );

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'создание_контейнера', 'order', ?)
      `);
      insertLog.run(
        `Создан контейнер ${newContainerNumber} объемом ${volume} ${order.measurement} для заказа ${order.order_number}${description ? `: ${description}` : ''}`
      );
    });

    transaction();

    return NextResponse.json({ 
      success: true,
      message: "Контейнер создан успешно",
      container: {
        container: existingContainers.length + 1,
        value: volume,
        description: description || `Контейнер ${existingContainers.length + 1}`,
      }
    });
  } catch (error) {
    console.error("Ошибка создания контейнера:", error);
    return NextResponse.json(
      { error: "Ошибка создания контейнера" },
      { status: 500 }
    );
  }
}
