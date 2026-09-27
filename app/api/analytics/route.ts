import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

// SQLite хранит datetime('now') в UTC как "YYYY-MM-DD HH:MM:SS".
// ISO-строка с "T" сравнивается с таким форматом неверно
// Местная дата 'YYYY-MM-DD' — формат бизнес-дат заказов и продаж
function toLocalDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toSqliteDate(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

// Функция для создания пустых данных аналитики
function getEmptyAnalyticsData() {
  return {
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
    ordersCount: 0,
    salesCount: 0,
    activeLoans: 0,
    monthlyRevenue: Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - (5 - i),
        1
      );
      const monthName = monthDate.toLocaleDateString("ru-RU", {
        month: "short",
        year: "numeric",
      });
      return {
        month: monthName,
        revenue: 0,
        expenses: 0,
      };
    }),
    topSuppliers: [],
    topItems: [],
    recentActivity: [],
  };
}

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const userRole = session.role;

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Доступ только для администраторов" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    // Начало периода. Даты заказов и продаж (orders.date, sales.date,
    // manager_sales.date) — бизнес-даты 'YYYY-MM-DD'; created_at у расходов —
    // время записи в UTC. Сравниваем каждую колонку со значением своего формата
    const now = new Date();
    let periodStart: Date | null = null;
    switch (period) {
      case "month":
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "year":
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
    }
    const startDate = periodStart ? toLocalDate(periodStart) : "0000-01-01";
    const startUtc = periodStart ? toSqliteDate(periodStart) : "0000-01-01 00:00:00";

    // Частичные операции делят заказ, создавая дочерние заказы с суффиксом
    // номера и описанием «Контейнер из …» и т. п. Это не новые закупки,
    // поэтому в количестве заказов считаем только исходные
    const IS_ROOT_ORDER = `NOT (
      o.order_number LIKE '%-%' AND (
        COALESCE(o.description, '') LIKE 'Контейнер из %' OR
        COALESCE(o.description, '') LIKE 'Транспортировка из %' OR
        COALESCE(o.description, '') LIKE 'Таможня из %' OR
        COALESCE(o.description, '') LIKE 'Оплачено из займа %'
      )
    )`;

    try {
      // Выручка — продажи за период
      const revenueResult = db
        .prepare("SELECT SUM(sale_price) as total FROM sales WHERE date >= ?")
        .get(startDate) as { total: number | null };
      const totalRevenue = revenueResult.total || 0;

      // Расходы. Доходы хранятся в expenses с отрицательной суммой и уже
      // учтены в выручке через sales — их не вычитаем повторно
      const expensesResult = db
        .prepare(
          "SELECT SUM(amount) as total FROM expenses WHERE amount > 0 AND created_at >= ?"
        )
        .get(startUtc) as { total: number | null };
      const totalExpenses = expensesResult.total || 0;

      // Прибыль = выручка - расходы
      const profit = totalRevenue - totalExpenses;

      // Количество заказов (закупок) за период
      const ordersResult = db
        .prepare(
          `SELECT COUNT(*) as count FROM orders o WHERE o.date >= ? AND ${IS_ROOT_ORDER}`
        )
        .get(startDate) as { count: number };
      const ordersCount = ordersResult.count || 0;

      // Количество продаж
      const salesResult = db
        .prepare("SELECT COUNT(*) as count FROM sales WHERE date >= ?")
        .get(startDate) as { count: number };
      const salesCount = salesResult.count || 0;

      // Активные займы
      const loansResult = db
        .prepare("SELECT COUNT(*) as count FROM loans WHERE is_paid = false")
        .get() as { count: number };
      const activeLoans = loansResult.count || 0;

      // Месячная выручка (последние 6 месяцев)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = monthDate.toLocaleDateString("ru-RU", {
          month: "short",
          year: "numeric",
        });

        const monthRevenueResult = db
          .prepare(
            "SELECT SUM(sale_price) as revenue FROM sales WHERE date >= ? AND date < ?"
          )
          .get(toLocalDate(monthDate), toLocalDate(nextMonthDate)) as {
          revenue: number | null;
        };

        const monthExpensesResult = db
          .prepare(
            `SELECT SUM(amount) as expenses FROM expenses
             WHERE amount > 0 AND created_at >= ? AND created_at < ?`
          )
          .get(toSqliteDate(monthDate), toSqliteDate(nextMonthDate)) as {
          expenses: number | null;
        };

        monthlyRevenue.push({
          month: monthName,
          revenue: monthRevenueResult.revenue || 0,
          expenses: monthExpensesResult.expenses || 0,
        });
      }

      // Топ поставщики и товары: сколько денег реально потрачено на закупку
      // (расходы типа 'order', привязанные к заказам) и сколько исходных заказов.
      // orders.total_price для этого не годится: он меняется при частичных продажах
      const rankBy = (groupColumn: "supplier_id" | "item_id", table: string) =>
        db
          .prepare(
            `
            SELECT name, totalOrders, totalValue FROM (
              SELECT
                t.name,
                (SELECT COUNT(*) FROM orders o
                 WHERE o.${groupColumn} = t.id AND o.date >= ? AND ${IS_ROOT_ORDER}) as totalOrders,
                (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
                 JOIN orders o ON o.id = e.related_id
                 WHERE e.type = 'order' AND e.amount > 0
                   AND o.${groupColumn} = t.id AND e.created_at >= ?) as totalValue
              FROM ${table} t
            )
            WHERE totalOrders > 0 OR totalValue > 0
            ORDER BY totalValue DESC
            LIMIT 5
          `
          )
          .all(startDate, startUtc) as any[];

      const topSuppliers = rankBy("supplier_id", "suppliers");
      const topItems = rankBy("item_id", "supplier_items");

      // Топ покупатели прямых продаж (продажи менеджерам исключаем по manager_id)
      const topBuyers = db
        .prepare(
          `
          SELECT
            buyer_name,
            COUNT(id) as orderCount,
            SUM(sale_price) as totalSpent
          FROM sales
          WHERE manager_id IS NULL AND date >= ?
          GROUP BY buyer_name
          ORDER BY totalSpent DESC
          LIMIT 5
        `
        )
        .all(startDate) as any[];

      // Топ покупатели менеджеров (кому продают менеджеры)
      const topManagerBuyers = db
        .prepare(
          `
          SELECT
            buyer_name,
            COUNT(id) as orderCount,
            SUM(sale_price) as totalSpent
          FROM manager_sales
          WHERE date >= ?
          GROUP BY buyer_name
          ORDER BY totalSpent DESC
          LIMIT 5
        `
        )
        .all(startDate) as any[];

      // Последняя активность
      const recentActivity = db
        .prepare(
          `
          SELECT action, details, created_at
          FROM activity_logs
          ORDER BY created_at DESC
          LIMIT 10
        `
        )
        .all() as any[];

      const analyticsData = {
        totalRevenue,
        totalExpenses,
        profit,
        ordersCount,
        salesCount,
        activeLoans,
        monthlyRevenue,
        topSuppliers: (topSuppliers || []).map((s) => ({
          ...s,
          totalValue: Number(s.totalValue || 0),
        })),
        topItems: (topItems || []).map((i) => ({
          ...i,
          totalValue: Number(i.totalValue || 0),
        })),
        topBuyers: (topBuyers || []).map((b) => ({
          ...b,
          totalSpent: Number(b.totalSpent || 0),
        })),
        topManagerBuyers: (topManagerBuyers || []).map((b) => ({
          ...b,
          totalSpent: Number(b.totalSpent || 0),
        })),
        recentActivity: recentActivity || [],
      };

      return NextResponse.json(analyticsData);
    } catch (dbError) {
      console.error("Ошибка базы данных при получении аналитики:", dbError);
      // Возвращаем пустые данные при ошибке базы данных
      return NextResponse.json(getEmptyAnalyticsData());
    }
  } catch (error) {
    console.error("Общая ошибка получения аналитики:", error);
    // В случае любой ошибки возвращаем пустые данные
    return NextResponse.json(getEmptyAnalyticsData());
  }
}
