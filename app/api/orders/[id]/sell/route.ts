import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { QTY_EPS, roundQty, sameQty } from "@/lib/quantity";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

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
    const orderId = parseInt(params.id);

    if (
      !(Number.isFinite(value) && value > 0) ||
      !(Number.isFinite(price) && price > 0) ||
      !buyer_name ||
      !date
    ) {
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

    if (value > order.value + QTY_EPS) {
      return NextResponse.json(
        { error: "Объем продажи не может превышать доступный объем" },
        { status: 400 }
      );
    }

    // Продажа менеджеру в долг: менеджер обязателен и должен быть активен.
    // Раньше без выбранного менеджера продажа молча записывалась как доход кассы
    let manager: any = null;
    if (link_to_manager) {
      manager = manager_id
        ? db
            .prepare(
              "SELECT * FROM users WHERE id = ? AND role = 'manager' AND is_active = true"
            )
            .get(manager_id)
        : null;
      if (!manager) {
        return NextResponse.json(
          { error: "Выберите активного менеджера для продажи в долг" },
          { status: 400 }
        );
      }
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      const totalSalePrice = value * price;

      // Создаем запись продажи. Для продажи менеджеру сохраняем его id:
      // по нему менеджер видит товар на своем складе (имя может меняться)
      db.prepare(
        `
        INSERT INTO sales (order_id, buyer_name, sale_value, sale_price, description, date, manager_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        orderId,
        manager ? manager.name : buyer_name,
        value,
        totalSalePrice,
        description || null,
        date,
        manager ? manager.id : null
      );

      // Обрабатываем связь с менеджером
      if (manager) {
        // Находим или создаем партнерскую запись менеджера (на ней хранится долг)
        let managerPartner = db
          .prepare("SELECT id FROM partners WHERE user_id = ? AND id != 0")
          .get(manager.id) as any;

        if (!managerPartner) {
          const partnerResult = db
            .prepare(
              `
              INSERT INTO partners (name, contact_info, user_id)
              VALUES (?, ?, ?)
            `
            )
            .run(manager.name, manager.email || "Нет email", manager.id);
          managerPartner = { id: partnerResult.lastInsertRowid };
        }

        // Долг менеджера по цене передачи товара. Это не деньги кассы:
        // в баланс он попадет, только когда менеджер заплатит
        db.prepare(
          `
          INSERT INTO loans (partner_id, order_id, amount, is_paid, kind)
          VALUES (?, ?, ?, false, 'manager_debt')
        `
        ).run(managerPartner.id, orderId, totalSalePrice);

        logActivity(session.userId, "займ_создан_продажа", "loan", `Создан займ на сумму $${totalSalePrice} за покупку товара из заказа ${order.order_number}. Менеджер должен оплатить после перепродажи.`);
      } else {
        // Обычная продажа без связи с менеджером - создаем отрицательный расход (доход)
        const insertIncome = db.prepare(`
          INSERT INTO expenses (amount, description, type, related_id, created_at)
          VALUES (?, ?, 'other', ?, datetime('now'))
        `);
        insertIncome.run(
          -totalSalePrice, // Отрицательная сумма = доход
          `Продажа товара покупателю ${buyer_name} - доход $${totalSalePrice}`,
          orderId
        );
      }

      if (sameQty(value, order.value)) {
        // Полная продажа - меняем статус заказа на "sold"
        const updateOrder = db.prepare(`
          UPDATE orders SET status = 'sold' WHERE id = ?
        `);
        updateOrder.run(orderId);
      } else {
        // Частичная продажа - уменьшаем объем заказа
        const remainingValue = roundQty(order.value - value);
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
      const logDetails =
        link_to_manager && manager_id
          ? `Заказ ${order.order_number}: продажа ${value} ${order.measurement} за $${totalSalePrice} покупателю ${buyer_name}. Связано с менеджером ID: ${manager_id}`
          : `Заказ ${order.order_number}: продажа ${value} ${order.measurement} за $${totalSalePrice} покупателю ${buyer_name}`;

      logActivity(session.userId, "продажа", "order", logDetails);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка продажи:", error);
    return NextResponse.json({ error: "Ошибка продажи" }, { status: 500 });
  }
}
