import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { getCashBalance, getOutstandingLoans } from "@/lib/balance";

// Инициализируем базу данных при первом запросе
initDatabase();

// Принудительно делаем эндпоинт динамическим
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

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
      // Баланс кассы без долга менеджеров (см. lib/balance.ts)
      totalBalance = getCashBalance();
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

    // Непогашенные займы раздельно: деньги, взятые у партнеров и
    // администратора (мы должны), и долг менеджеров за товар (должны нам)
    let partnerLoans = 0;
    let managerDebt = 0;
    try {
      ({ partnerLoans, managerDebt } = getOutstandingLoans());
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
