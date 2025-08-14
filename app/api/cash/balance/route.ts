import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

// Принудительно делаем эндпоинт динамическим
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Получаем общую сумму всех непогашенных займов от партнеров (деньги которые мы взяли и еще не вернули)
    const activeLoansResult = db
      .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
      .get() as { total: number | null };
    const activeLoans = activeLoansResult.total || 0;

    // Получаем общую сумму расходов (положительные значения)
    const expensesResult = db
      .prepare("SELECT SUM(amount) as total FROM expenses WHERE amount > 0")
      .get() as { total: number | null };
    const totalExpenses = expensesResult.total || 0;

    // Получаем общую сумму доходов (отрицательные значения в expenses)
    const incomeResult = db
      .prepare(
        "SELECT SUM(ABS(amount)) as total FROM expenses WHERE amount < 0"
      )
      .get() as { total: number | null };
    const totalIncome = incomeResult.total || 0;

    // Доступный баланс = займы + доходы - расходы
    const balance = activeLoans + totalIncome - totalExpenses;

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Ошибка получения баланса:", error);
    return NextResponse.json(
      { error: "Ошибка получения баланса" },
      { status: 500 }
    );
  }
}
