import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

// Инициализируем базу данных при первом запросе
initDatabase();

// Принудительно делаем эндпоинт динамическим
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Убедимся, что таблицы существуют, если нет - возвращаем нули
    let totalOrders = 0;
    let pendingOrders = 0;
    let totalBalance = 0;
    let suppliersCount = 0;

    try {
      const totalOrdersResult = db
        .prepare("SELECT COUNT(*) as count FROM orders")
        .get() as { count: number };
      totalOrders = totalOrdersResult.count;
    } catch (e) {
      console.log("Таблица orders еще не создана");
    }

    try {
      const pendingOrdersResult = db
        .prepare("SELECT COUNT(*) as count FROM orders WHERE status != ?")
        .get("sold") as { count: number };
      pendingOrders = pendingOrdersResult.count;
    } catch (e) {
      console.log("Таблица orders еще не создана");
    }

    try {
      // Правильный расчет баланса: займы + доходы - расходы
      const activeLoansResult = db
        .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
        .get() as { total: number | null };
      const activeLoans = activeLoansResult.total || 0;

      const expensesResult = db
        .prepare("SELECT SUM(amount) as total FROM expenses WHERE amount > 0")
        .get() as { total: number | null };
      const totalExpenses = expensesResult.total || 0;

      const incomeResult = db
        .prepare("SELECT SUM(ABS(amount)) as total FROM expenses WHERE amount < 0")
        .get() as { total: number | null };
      const totalIncome = incomeResult.total || 0;

      totalBalance = activeLoans + totalIncome - totalExpenses;
    } catch (e) {
      console.log("Таблица loans или expenses еще не создана");
    }

    try {
      const suppliersCountResult = db
        .prepare("SELECT COUNT(*) as count FROM suppliers")
        .get() as { count: number };
      suppliersCount = suppliersCountResult.count;
    } catch (e) {
      console.log("Таблица suppliers еще не создана");
    }

    // Количество и объем заказов на каждом этапе
    let pipeline: { status: string; count: number; total: number }[] = [];
    try {
      pipeline = db
        .prepare(
          `SELECT status, COUNT(*) as count, COALESCE(SUM(total_price), 0) as total
           FROM orders GROUP BY status`
        )
        .all() as { status: string; count: number; total: number }[];
    } catch (e) {
      console.log("Таблица orders еще не создана");
    }

    // Непогашенные займы раздельно: деньги, взятые у партнеров (мы должны),
    // и долг менеджеров за товар (должны нам)
    let partnerLoans = 0;
    let managerDebt = 0;
    try {
      const loanTotals = db
        .prepare(
          `SELECT
             COALESCE(SUM(CASE WHEN u.role = 'manager' THEN 0 ELSE l.amount END), 0) as partner_loans,
             COALESCE(SUM(CASE WHEN u.role = 'manager' THEN l.amount ELSE 0 END), 0) as manager_debt
           FROM loans l
           LEFT JOIN partners p ON l.partner_id = p.id
           LEFT JOIN users u ON p.user_id = u.id
           WHERE l.is_paid = false`
        )
        .get() as { partner_loans: number; manager_debt: number };
      partnerLoans = loanTotals.partner_loans;
      managerDebt = loanTotals.manager_debt;
    } catch (e) {
      console.log("Таблица loans еще не создана");
    }

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      totalBalance,
      suppliersCount,
      pipeline,
      partnerLoans,
      managerDebt,
    });
  } catch (error) {
    console.error("Ошибка получения статистики:", error);
    return NextResponse.json(
      { error: "Ошибка получения статистики" },
      { status: 500 }
    );
  }
}
