import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { QTY_EPS, roundQty } from "@/lib/quantity";

initDatabase();

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const userId = session.userId;
    const userRole = session.role;

    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { item_id, value, price, buyer_name, description, date } = body;

    if (!item_id || !value || !price || !buyer_name || !date) {
      return NextResponse.json(
        { error: "Все обязательные поля должны быть заполнены" },
        { status: 400 }
      );
    }

    if (!(Number.isFinite(value) && value > 0) || !(Number.isFinite(price) && price > 0)) {
      return NextResponse.json(
        { error: "Количество и цена должны быть больше нуля" },
        { status: 400 }
      );
    }

    // Товар должен быть продан именно этому менеджеру (по id, а не по имени:
    // имя может измениться или совпасть с чужим)
    const originalSale = db
      .prepare(
        `
        SELECT s.*, o.measurement, o.order_number, si.name as item_name
        FROM sales s
        JOIN orders o ON s.order_id = o.id
        JOIN supplier_items si ON o.item_id = si.id
        WHERE s.id = ? AND s.manager_id = ?
      `
      )
      .get(item_id, userId) as any;

    if (!originalSale) {
      return NextResponse.json(
        { error: "Товар не найден в вашем складе" },
        { status: 404 }
      );
    }

    // Проверяем доступное количество (с допуском на дробные объемы)
    const soldQuantity = db
      .prepare(
        `
        SELECT COALESCE(SUM(sale_value), 0) as total_sold 
        FROM manager_sales 
        WHERE related_sale_id = ? AND manager_id = ?
      `
      )
      .get(item_id, userId) as { total_sold: number };

    const availableQuantity = roundQty(
      originalSale.sale_value - soldQuantity.total_sold
    );

    if (value > availableQuantity + QTY_EPS) {
      return NextResponse.json(
        {
          error: `Недостаточно товара. Доступно: ${availableQuantity} ${originalSale.measurement}`,
        },
        { status: 400 }
      );
    }

    // Записываем перепродажу. Долг менеджера не меняется: он должен компании
    // цену, по которой получил товар, а перепродажа — его собственная сделка
    const saleId = db.transaction(() => {
      const saleResult = db
        .prepare(
          `
        INSERT INTO manager_sales (
          manager_id, related_sale_id, sale_value, sale_price, 
          buyer_name, description, date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(userId, item_id, value, price, buyer_name, description || null, date);

      logActivity(session.userId, "продажа_менеджера", "manager_sale", `Менеджер продал ${value} ${originalSale.measurement} товара "${originalSale.item_name}" за $${price}`);

      return saleResult.lastInsertRowid;
    })();

    return NextResponse.json({
      success: true,
      sale_id: saleId,
    });
  } catch (error: any) {
    console.error("Ошибка продажи товара менеджером:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка продажи товара" },
      { status: 500 }
    );
  }
}
