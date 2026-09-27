"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  ordersCount: number;
  salesCount: number;
  activeLoans: number;
  monthlyRevenue: Array<{ month: string; revenue: number; expenses: number }>;
  topSuppliers: Array<{
    name: string;
    totalOrders: number;
    totalValue: number;
  }>;
  topItems: Array<{ name: string; totalOrders: number; totalValue: number }>;
  topBuyers: Array<{
    buyer_name: string;
    orderCount: number;
    totalSpent: number;
  }>;
  topManagerBuyers: Array<{
    buyer_name: string;
    orderCount: number;
    totalSpent: number;
  }>;
  recentActivity: Array<{
    action: string;
    details: string;
    created_at: string;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // month, quarter, year
  const router = useRouter();

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`/api/analytics?period=${selectedPeriod}`);
      if (response.status === 403) {
        alert("Доступ запрещен! Только для администраторов.");
        router.push("/");
        return;
      }

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        console.error("Ошибка загрузки аналитики");
      }
    } catch (error) {
      console.error("Ошибка загрузки аналитики:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"></div>
          <p className="mt-3 text-sm text-ink-500">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <p className="text-sm text-ink-500">Ошибка загрузки данных аналитики</p>
      </div>
    );
  }

  // Шкала для полос по месяцам: максимум из выручки и расходов
  const maxMonthly = Math.max(
    1,
    ...data.monthlyRevenue.flatMap((m) => [m.revenue || 0, m.expenses || 0])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Аналитика и отчеты"
        description="Детальная аналитика бизнеса"
        actions={
          /* Выбор периода */
          <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
            {[
              { value: "month", label: "Месяц" },
              { value: "quarter", label: "Квартал" },
              { value: "year", label: "Год" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedPeriod === period.value
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Основные показатели */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Выручка"
          value={formatMoney(data.totalRevenue)}
          icon="trendUp"
          tone="positive"
        />
        <StatCard
          label="Расходы"
          value={formatMoney(data.totalExpenses)}
          icon="wallet"
          tone="negative"
        />
        <StatCard
          label="Прибыль"
          value={
            <span className={data.profit < 0 ? "text-red-600" : undefined}>
              {formatMoney(data.profit)}
            </span>
          }
          hint="Выручка минус все расходы, включая закупку непроданного товара"
          icon="chart"
          tone={data.profit < 0 ? "negative" : "positive"}
        />
        <StatCard
          label="Заказов"
          value={data.ordersCount}
          icon="cube"
          tone="neutral"
        />
      </div>

      {/* Графики и таблицы */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Месячная выручка */}
        <section className="card">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">
              Выручка по месяцам
            </h2>
            <div className="flex items-center gap-3 text-xs text-ink-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Выручка
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Расходы
              </span>
            </div>
          </div>
          {data.monthlyRevenue.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {data.monthlyRevenue.map((month, index) => (
                <li key={index} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-600">{month.month}</span>
                    <div className="flex items-center gap-4 text-right text-sm font-medium">
                      <span className="text-emerald-600">
                        {formatMoney(month.revenue)}
                      </span>
                      <span className="text-red-600">
                        {formatMoney(month.expenses)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${((month.revenue || 0) / maxMonthly) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{
                          width: `${((month.expenses || 0) / maxMonthly) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState />
          )}
        </section>

        {/* Топ поставщики */}
        <RankedList
          title="Топ поставщики"
          rows={data.topSuppliers?.map((supplier) => ({
            name: supplier.name,
            value: supplier.totalValue,
            sub: `${supplier.totalOrders} заказов`,
          }))}
        />
      </div>

      {/* Дополнительная аналитика */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Топ товары */}
        <RankedList
          title="Популярные товары"
          rows={data.topItems?.map((item) => ({
            name: item.name,
            value: item.totalValue,
            sub: `${item.totalOrders} заказов`,
          }))}
        />

        {/* Топ покупатели */}
        <RankedList
          title="Топ покупатели (прямые продажи)"
          rows={data.topBuyers?.map((buyer) => ({
            name: buyer.buyer_name,
            value: buyer.totalSpent,
            sub: `${buyer.orderCount} заказов`,
          }))}
        />

        {/* Топ покупатели менеджеров */}
        <RankedList
          title="Покупатели менеджеров"
          rows={data.topManagerBuyers?.map((buyer) => ({
            name: buyer.buyer_name,
            value: buyer.totalSpent,
            sub: `${buyer.orderCount} покупок`,
          }))}
        />

        {/* Последняя активность */}
        <section className="card">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">
              Последняя активность
            </h2>
          </div>
          {data.recentActivity.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {data.recentActivity.map((activity, index) => (
                <li key={index} className="flex items-start gap-3 px-5 py-3">
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800">{activity.details}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatDateTime(activity.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-10 text-center text-sm text-ink-500">Нет данных</div>
  );
}

// Нумерованный список с суммой справа
function RankedList({
  title,
  rows,
}: {
  title: string;
  rows?: Array<{ name: string; value: number; sub: string }>;
}) {
  return (
    <section className="card">
      <div className="border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      </div>
      {rows && rows.length > 0 ? (
        <ul className="divide-y divide-ink-100">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-medium text-ink-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                {row.name}
              </span>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-ink-900">
                  {formatMoney(row.value)}
                </div>
                <div className="text-xs text-ink-500">{row.sub}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState />
      )}
    </section>
  );
}
