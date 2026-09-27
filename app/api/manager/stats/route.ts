import { NextRequest, NextResponse } from "next/server";
import { getJwtSecret } from "@/lib/auth";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(request: NextRequest) {
  try {
    // Получаем токен из cookie
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Токен авторизации не найден" },
        { status: 401 }
      );
    }

    // Декодируем токен
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.userId as number;
    const userRole = payload.role as string;

    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    // Получаем общий долг менеджера
    const debtResult = db
      .prepare(
        `
        SELECT SUM(amount) as totalDebt 
        FROM loans 
        WHERE partner_id = (SELECT id FROM partners WHERE user_id = ?) 
        AND is_paid = false
      `
      )
      .get(userId) as { totalDebt: number | null };

    // Количество позиций на складе менеджера — по тем же условиям, что и
    // /api/manager/warehouse: товар остается на складе, пока не перепродан,
    // даже если менеджер уже рассчитался за него
    const warehouseResult = db
      .prepare(
        `
        SELECT COUNT(DISTINCT s.id) as totalItems
        FROM sales s
        JOIN loans l ON l.order_id = s.order_id
        JOIN partners p ON l.partner_id = p.id
        LEFT JOIN (
          SELECT related_sale_id, SUM(sale_value) as total_sold
          FROM manager_sales
          WHERE manager_id = ?
          GROUP BY related_sale_id
        ) sold_sum ON s.id = sold_sum.related_sale_id
        WHERE p.user_id = ?
        AND s.buyer_name = (SELECT name FROM users WHERE id = ?)
        AND (s.sale_value - COALESCE(sold_sum.total_sold, 0)) > 0
      `
      )
      .get(userId, userId, userId) as { totalItems: number };

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
