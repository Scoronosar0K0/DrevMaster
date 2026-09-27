import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

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

    // Долги менеджера за товар (хранятся на его партнерской записи)
    const loans = db
      .prepare(
        `
        SELECT 
          l.*,
          o.order_number
        FROM loans l
        JOIN partners p ON l.partner_id = p.id
        LEFT JOIN orders o ON l.order_id = o.id
        WHERE p.user_id = ? AND l.kind = 'manager_debt'
        ORDER BY l.created_at DESC
      `
      )
      .all(userId) as any[];

    // Сводка. Сумма займа уменьшается при частичной оплате, поэтому «всего»
    // считаем по стоимости полученного товара (продажи этому менеджеру),
    // а «выплачено» — как разницу с текущим долгом
    const received = db
      .prepare(
        "SELECT COALESCE(SUM(sale_price), 0) as total FROM sales WHERE manager_id = ?"
      )
      .get(userId) as { total: number };
    const currentDebt = loans
      .filter((loan) => !loan.is_paid)
      .reduce((sum, loan) => sum + loan.amount, 0);
    const totalLoans = Math.max(received.total, currentDebt);
    const totalPaid = Math.round((totalLoans - currentDebt) * 100) / 100;

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
