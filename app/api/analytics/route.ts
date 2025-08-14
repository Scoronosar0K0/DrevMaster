import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
import { jwtVerify } from "jose";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
);

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
    let userRole: string;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = payload.role as string;
    } catch (jwtError) {
      console.error("Ошибка JWT верификации:", jwtError);
      return NextResponse.json(
        { error: "Недействительный токен авторизации" },
        { status: 401 }
      );
    }

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Доступ только для администраторов" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    // Определяем диапазон дат в зависимости от периода
    let dateFilter = "";
    const now = new Date();

    switch (period) {
      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = `AND created_at >= '${startOfMonth.toISOString()}'`;
        break;
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const startOfQuarter = new Date(
          now.getFullYear(),
          currentQuarter * 3,
          1
        );
        dateFilter = `AND created_at >= '${startOfQuarter.toISOString()}'`;
        break;
      case "year":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = `AND created_at >= '${startOfYear.toISOString()}'`;
        break;
    }

    try {
      // Получаем общую выручку (сумма всех продаж)
      const revenueResult = db
        .prepare(
          `SELECT SUM(sale_price) as total FROM sales WHERE 1=1 ${dateFilter}`
        )
        .get() as { total: number | null };
      const totalRevenue = revenueResult.total || 0;

      // Получаем общие расходы
      const expensesResult = db
        .prepare(
          `SELECT SUM(amount) as total FROM expenses WHERE 1=1 ${dateFilter}`
        )
        .get() as { total: number | null };
      const totalExpenses = expensesResult.total || 0;

      // Прибыль = выручка - расходы
      const profit = totalRevenue - totalExpenses;

      // Количество заказов
      const ordersResult = db
        .prepare(`SELECT COUNT(*) as count FROM orders WHERE 1=1 ${dateFilter}`)
        .get() as { count: number };
      const ordersCount = ordersResult.count || 0;

      // Количество продаж
      const salesResult = db
        .prepare(`SELECT COUNT(*) as count FROM sales WHERE 1=1 ${dateFilter}`)
        .get() as { count: number };
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
        const nextMonthDate = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          1
        );

        const monthName = monthDate.toLocaleDateString("ru-RU", {
          month: "short",
          year: "numeric",
        });

        const monthRevenueResult = db
          .prepare(
            `
            SELECT SUM(sale_price) as revenue 
            FROM sales 
            WHERE created_at >= ? AND created_at < ?
          `
          )
          .get(monthDate.toISOString(), nextMonthDate.toISOString()) as {
          revenue: number | null;
        };

        const monthExpensesResult = db
          .prepare(
            `
            SELECT SUM(amount) as expenses 
            FROM expenses 
            WHERE created_at >= ? AND created_at < ?
          `
          )
          .get(monthDate.toISOString(), nextMonthDate.toISOString()) as {
          expenses: number | null;
        };

        monthlyRevenue.push({
          month: monthName,
          revenue: monthRevenueResult.revenue || 0,
          expenses: monthExpensesResult.expenses || 0,
        });
      }

      // Топ поставщики
      const topSuppliers = db
        .prepare(
          `
          SELECT 
            s.name,
            COUNT(o.id) as totalOrders,
            SUM(o.total_price) as totalValue
          FROM suppliers s
          JOIN orders o ON s.id = o.supplier_id
          WHERE 1=1 ${dateFilter.replace("created_at", "o.created_at")}
          GROUP BY s.id, s.name
          ORDER BY totalValue DESC
          LIMIT 5
        `
        )
        .all() as any[];

      // Топ товары
      const topItems = db
        .prepare(
          `
          SELECT 
            si.name,
            COUNT(o.id) as totalOrders,
            SUM(o.total_price) as totalValue
          FROM supplier_items si
          JOIN orders o ON si.id = o.item_id
          WHERE 1=1 ${dateFilter.replace("created_at", "o.created_at")}
          GROUP BY si.id, si.name
          ORDER BY totalValue DESC
          LIMIT 5
        `
        )
        .all() as any[];

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
