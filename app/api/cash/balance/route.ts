import { NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET() {
  try {
    // Получаем общую сумму всех непогашенных займов от партнеров
    const loansResult = db
      .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
      .get() as { total: number | null };
    const totalLoans = loansResult.total || 0;

    // Получаем общую сумму всех расходов
    const expensesResult = db
      .prepare("SELECT SUM(amount) as total FROM expenses")
      .get() as { total: number | null };
    const totalExpenses = expensesResult.total || 0;

    // Доступный баланс = займы - расходы
    const balance = totalLoans - totalExpenses;

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Ошибка получения баланса:", error);
    return NextResponse.json(
      { error: "Ошибка получения баланса" },
      { status: 500 }
    );
  }
}
