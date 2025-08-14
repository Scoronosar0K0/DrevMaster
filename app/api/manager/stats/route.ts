import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
);

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
    const { payload } = await jwtVerify(token, JWT_SECRET);
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

    // Получаем количество товаров на складе (неоплаченные займы менеджера)
    const warehouseResult = db
      .prepare(
        `
        SELECT COUNT(*) as totalItems 
        FROM loans l
        JOIN partners p ON l.partner_id = p.id
        WHERE p.user_id = ?
        AND l.is_paid = false
      `
      )
      .get(userId) as { totalItems: number };

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
