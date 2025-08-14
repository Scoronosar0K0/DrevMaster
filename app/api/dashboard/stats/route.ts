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
      // Правильный расчет баланса: займы - расходы
      const activeLoansResult = db
        .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
        .get() as { total: number | null };
      const activeLoans = activeLoansResult.total || 0;

      const expensesResult = db
        .prepare("SELECT SUM(amount) as total FROM expenses")
        .get() as { total: number | null };
      const totalExpenses = expensesResult.total || 0;

      totalBalance = activeLoans - totalExpenses;
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

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      totalBalance,
      suppliersCount,
    });
  } catch (error) {
    console.error("Ошибка получения статистики:", error);
    return NextResponse.json(
      { error: "Ошибка получения статистики" },
      { status: 500 }
    );
  }
}
