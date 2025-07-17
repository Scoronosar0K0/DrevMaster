import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {
      value,
      price,
      buyer_name,
      description,
      date,
      link_to_manager,
      manager_id,
    } = body;
    const resolvedParams = await params;
    const orderId = parseInt(resolvedParams.id);

    if (!value || value <= 0 || !price || price <= 0 || !buyer_name || !date) {
      return NextResponse.json(
        { error: "Все поля должны быть заполнены корректно" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует и имеет статус "warehouse"
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND status = ?")
      .get(orderId, "warehouse") as any;
    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден или товар не на складе" },
        { status: 404 }
      );
    }

    if (value > order.value) {
      return NextResponse.json(
        { error: "Объем продажи не может превышать доступный объем" },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      const totalSalePrice = value * price;

      // Создаем запись продажи
      const insertSale = db.prepare(`
        INSERT INTO sales (order_id, buyer_name, sale_value, sale_price, description, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertSale.run(
        orderId,
        buyer_name,
        value,
        totalSalePrice,
        description || null,
        date
      );

      // Обрабатываем связь с менеджером
      if (link_to_manager && manager_id) {
        // Проверяем, что менеджер существует
        const manager = db
          .prepare(
            "SELECT * FROM users WHERE id = ? AND role = 'manager' AND is_active = true"
          )
          .get(manager_id) as any;

        if (manager) {
          // Автоматически заполняем имя покупателя именем менеджера
          const actualBuyerName = manager.name;

          // Обновляем запись продажи с именем менеджера
          const updateSale = db.prepare(`
            UPDATE sales SET buyer_name = ? WHERE rowid = last_insert_rowid()
          `);
          updateSale.run(actualBuyerName);

          // Находим партнера менеджера
          const managerPartner = db
            .prepare("SELECT id FROM partners WHERE user_id = ?")
            .get(manager_id) as any;

          if (managerPartner) {
            // Создаем новый займ для менеджера (увеличиваем его долг)
            const insertManagerLoan = db.prepare(`
              INSERT INTO loans (partner_id, order_id, amount, is_paid)
              VALUES (?, ?, ?, false)
            `);
            insertManagerLoan.run(managerPartner.id, orderId, totalSalePrice);

            // Логируем создание займа
            const insertLoanLog = db.prepare(`
              INSERT INTO activity_logs (user_id, action, entity_type, details)
              VALUES (?, 'займ_создан_продажа', 'loan', ?)
            `);
            insertLoanLog.run(
              manager_id,
              `Создан займ на сумму $${totalSalePrice} за покупку товара из заказа ${order.order_number}. Менеджер должен оплатить после перепродажи.`
            );
          } else {
            // Менеджер не имеет записи партнера, добавляем в общий баланс
            const insertLoan = db.prepare(`
              INSERT INTO loans (partner_id, amount, is_paid)
              VALUES (1, ?, false)
            `);
            insertLoan.run(totalSalePrice);
          }
        } else {
          // Менеджер не найден, добавляем всю сумму в общий баланс
          const insertLoan = db.prepare(`
            INSERT INTO loans (partner_id, amount, is_paid)
            VALUES (1, ?, false)
          `);
          insertLoan.run(totalSalePrice);
        }
      } else {
        // Обычная продажа без связи с менеджером
        const insertLoan = db.prepare(`
          INSERT INTO loans (partner_id, amount, is_paid)
          VALUES (1, ?, false)
        `);
        insertLoan.run(totalSalePrice);
      }

      if (value === order.value) {
        // Полная продажа - меняем статус заказа на "sold"
        const updateOrder = db.prepare(`
          UPDATE orders SET status = 'sold' WHERE id = ?
        `);
        updateOrder.run(orderId);
      } else {
        // Частичная продажа - уменьшаем объем заказа
        const remainingValue = order.value - value;
        const pricePerUnit = order.total_price / order.value;
        const remainingTotalPrice = remainingValue * pricePerUnit;

        const updateOrder = db.prepare(`
          UPDATE orders 
          SET value = ?, total_price = ?
          WHERE id = ?
        `);
        updateOrder.run(remainingValue, remainingTotalPrice, orderId);
      }

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (?, 'продажа', 'order', ?)
      `);
      const logDetails =
        link_to_manager && manager_id
          ? `Заказ ${order.order_number}: продажа ${value} ${order.measurement} за $${totalSalePrice} покупателю ${buyer_name}. Связано с менеджером ID: ${manager_id}`
          : `Заказ ${order.order_number}: продажа ${value} ${order.measurement} за $${totalSalePrice} покупателю ${buyer_name}`;

      insertLog.run(link_to_manager && manager_id ? manager_id : 1, logDetails);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка продажи:", error);
    return NextResponse.json({ error: "Ошибка продажи" }, { status: 500 });
  }
}
