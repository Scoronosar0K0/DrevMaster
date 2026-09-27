import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { amount, description, link_to_order, order_id } = body;

    if (!(Number.isFinite(amount) && amount > 0)) {
      return NextResponse.json(
        { error: "Сумма расхода должна быть больше 0" },
        { status: 400 }
      );
    }

    // Отмечено «Связать с заказом», но заказ не выбран — иначе расход молча
    // сохранился бы без привязки к заказу
    if (link_to_order && !order_id) {
      return NextResponse.json(
        { error: "Выберите заказ для привязки расхода" },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Создаем запись расхода
      const insertExpense = db.prepare(`
        INSERT INTO expenses (amount, description, type, related_id)
        VALUES (?, ?, ?, ?)
      `);

      let expenseType = "other";
      let relatedId = null;

      if (link_to_order && order_id) {
        // Проверяем, что заказ существует
        const order = db
          .prepare("SELECT * FROM orders WHERE id = ?")
          .get(order_id) as any;

        if (!order) {
          throw new Error("Заказ не найден");
        }

        expenseType = "order";
        relatedId = order_id;

        // Увеличиваем цену заказа на сумму расхода и запоминаем расход
        // отдельно: при оплате займа он переносится в оплаченный заказ
        const updateOrder = db.prepare(`
          UPDATE orders 
          SET total_price = COALESCE(total_price, 0) + ?,
              extra_costs = COALESCE(extra_costs, 0) + ?
          WHERE id = ?
        `);
        updateOrder.run(amount, amount, order_id);

        // Логируем увеличение цены заказа
        logActivity(session.userId, "увеличение_цены_заказа", "order", `Заказ ${
            order.order_number
          }: увеличение цены на $${amount} из-за дополнительного расхода. Новая цена: $${(
            order.total_price + amount
          ).toFixed(2)}`);
      }

      insertExpense.run(
        amount,
        description || "Дополнительный расход",
        expenseType,
        relatedId
      );

      // Логируем создание расхода
      const logDescription =
        link_to_order && order_id
          ? `Создан расход на сумму $${amount}, связанный с заказом ID: ${order_id}. ${
              description || ""
            }`
          : `Создан расход на сумму $${amount}. ${description || ""}`;

      logActivity(session.userId, "создание_расхода", "expense", logDescription);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка создания расхода:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ошибка создания расхода",
      },
      { status: 500 }
    );
  }
}
