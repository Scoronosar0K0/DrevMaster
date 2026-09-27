import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { QTY_EPS } from "@/lib/quantity";

initDatabase();

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    if (session.role !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    // Товар на складе менеджера — продажи ему (sales.manager_id), за вычетом
    // уже перепроданного. Раньше менеджер определялся по имени покупателя,
    // а соединение с займами по заказу дублировало строки
    const warehouseItems = db
      .prepare(
        `
        SELECT
          s.id,
          s.order_id,
          o.order_number,
          sup.name as supplier_name,
          si.name as item_name,
          s.sale_value,
          s.sale_price,
          o.measurement,
          s.description,
          s.date as sale_date,
          o.status,
          (s.sale_value - COALESCE(sold_sum.total_sold, 0)) as remaining_value
        FROM sales s
        JOIN orders o ON s.order_id = o.id
        JOIN suppliers sup ON o.supplier_id = sup.id
        JOIN supplier_items si ON o.item_id = si.id
        LEFT JOIN (
          SELECT related_sale_id, SUM(sale_value) as total_sold
          FROM manager_sales
          WHERE manager_id = ?
          GROUP BY related_sale_id
        ) sold_sum ON s.id = sold_sum.related_sale_id
        WHERE s.manager_id = ?
        AND (s.sale_value - COALESCE(sold_sum.total_sold, 0)) > ?
        ORDER BY s.date DESC
      `
      )
      .all(session.userId, session.userId, QTY_EPS);

    return NextResponse.json(warehouseItems);
  } catch (error) {
    console.error("Ошибка получения товаров склада менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка получения товаров склада" },
      { status: 500 }
    );
  }
}
