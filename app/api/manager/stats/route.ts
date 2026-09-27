import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { QTY_EPS } from "@/lib/quantity";

initDatabase();

export async function GET(request: NextRequest) {
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

    // Долг менеджера — непогашенные долги за полученный товар
    const debtResult = db
      .prepare(
        `
        SELECT SUM(l.amount) as totalDebt
        FROM loans l
        JOIN partners p ON l.partner_id = p.id
        WHERE p.user_id = ? AND l.kind = 'manager_debt' AND l.is_paid = false
      `
      )
      .get(userId) as { totalDebt: number | null };

    // Позиции на складе — как в /api/manager/warehouse: товар, проданный этому
    // менеджеру (sales.manager_id) и еще не перепроданный полностью
    const warehouseResult = db
      .prepare(
        `
        SELECT COUNT(*) as totalItems
        FROM sales s
        LEFT JOIN (
          SELECT related_sale_id, SUM(sale_value) as total_sold
          FROM manager_sales
          WHERE manager_id = ?
          GROUP BY related_sale_id
        ) sold_sum ON s.id = sold_sum.related_sale_id
        WHERE s.manager_id = ?
        AND (s.sale_value - COALESCE(sold_sum.total_sold, 0)) > ?
      `
      )
      .get(userId, userId, QTY_EPS) as { totalItems: number };

    // Получаем количество ожидающих переводов
    const transfersResult = db
      .prepare(
        `
        SELECT COUNT(*) as pendingTransfers 
        FROM manager_transfers 
        WHERE from_manager_id = ? AND status = 'pending'
      `
      )
      .get(userId) as { pendingTransfers: number };

    return NextResponse.json({
      totalDebt: debtResult.totalDebt || 0,
      totalWarehouseItems: warehouseResult.totalItems || 0,
      pendingTransfers: transfersResult.pendingTransfers || 0,
    });
  } catch (error) {
    console.error("Ошибка получения статистики менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка получения статистики" },
      { status: 500 }
    );
  }
}
