import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

// Принудительно делаем эндпоинт динамическим
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Получаем общую сумму всех непогашенных займов от партнеров (деньги которые мы взяли и еще не вернули)
    const activeLoansResult = db
      .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
      .get() as { total: number | null };
    const activeLoans = activeLoansResult.total || 0;

    // Получаем общую сумму всех расходов (включая оплаты займов)
    const expensesResult = db
      .prepare("SELECT SUM(amount) as total FROM expenses")
      .get() as { total: number | null };
    const totalExpenses = expensesResult.total || 0;

    // Доступный баланс = активные займы - все расходы
    // Активные займы увеличивают баланс (деньги которые мы получили)
    // Расходы уменьшают баланс (включая возврат займов, оплату транспорта, таможни и т.д.)
    const balance = activeLoans - totalExpenses;

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Ошибка получения баланса:", error);
    return NextResponse.json(
      { error: "Ошибка получения баланса" },
      { status: 500 }
    );
  }
}
