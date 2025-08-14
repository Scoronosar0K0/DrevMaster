import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "R2EYR5d7gdXup846"
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

    // Получаем ID партнера для этого менеджера
    const partnerResult = db
      .prepare("SELECT id FROM partners WHERE user_id = ?")
      .get(userId) as { id: number } | undefined;

    if (!partnerResult) {
      return NextResponse.json(
        { error: "Партнер не найден для этого менеджера" },
        { status: 404 }
      );
    }

    const partnerId = partnerResult.id;

    // Получаем все займы менеджера с информацией о заказах
    const loans = db
      .prepare(
        `
        SELECT 
          l.*,
          o.order_number
        FROM loans l
        LEFT JOIN orders o ON l.order_id = o.id
        WHERE l.partner_id = ?
        ORDER BY l.created_at DESC
      `
      )
      .all(partnerId);

    // Вычисляем сводную информацию
    const totalLoans = loans.reduce(
      (sum: number, loan: any) => sum + loan.amount,
      0
    );
    const totalPaid = loans
      .filter((loan: any) => loan.is_paid)
      .reduce((sum: number, loan: any) => sum + loan.amount, 0);
    const currentDebt = totalLoans - totalPaid;

    return NextResponse.json({
      loans,
      summary: {
        totalLoans,
        totalPaid,
        currentDebt,
      },
    });
  } catch (error) {
    console.error("Ошибка получения финансовых данных менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка получения финансовых данных" },
      { status: 500 }
    );
  }
}
