"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Ошибка загрузки данных аналитики</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              📊 Аналитика и Отчеты
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Детальная аналитика бизнеса
            </p>
          </div>

          {/* Выбор периода */}
          <div className="flex space-x-2">
            {[
              { value: "month", label: "Месяц" },
              { value: "quarter", label: "Квартал" },
              { value: "year", label: "Год" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Основные показатели */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Выручка</p>
                <p className="text-2xl font-bold">
                  ${data.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Расходы</p>
                <p className="text-2xl font-bold">
                  ${data.totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">📉</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Прибыль</p>
                <p className="text-2xl font-bold">
                  ${data.profit.toLocaleString()}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Заказов</p>
                <p className="text-2xl font-bold">{data.ordersCount}</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>
        </div>

        {/* Графики и таблицы */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Месячная выручка */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Выручка по месяцам
            </h3>
            <div className="space-y-3">
              {data.monthlyRevenue.map((month, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{month.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">
                        ${month.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">
                        ${month.expenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Топ поставщики */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Топ поставщики
            </h3>
            <div className="space-y-3">
              {data.topSuppliers.map((supplier, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {supplier.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      ${supplier.totalValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {supplier.totalOrders} заказов
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Дополнительная аналитика */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Топ товары */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Популярные товары
            </h3>
            <div className="space-y-3">
              {data.topItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      ${item.totalValue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.totalOrders} заказов
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Топ покупатели */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Топ покупатели (прямые продажи)
            </h3>
            <div className="space-y-3">
              {data.topBuyers?.map((buyer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">
                      {buyer.buyer_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      ${buyer.totalSpent?.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {buyer.orderCount} заказов
                    </div>
                  </div>
                </div>
              )) || <p className="text-gray-500">Нет данных</p>}
            </div>
          </div>

          {/* Топ покупатели менеджеров */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Покупатели менеджеров
            </h3>
            <div className="space-y-3">
              {data.topManagerBuyers?.map((buyer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">
                      {buyer.buyer_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      ${buyer.totalSpent?.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {buyer.orderCount} покупок
                    </div>
                  </div>
                </div>
              )) || <p className="text-gray-500">Нет данных</p>}
            </div>
          </div>

          {/* Последняя активность */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Последняя активность
            </h3>
            <div className="space-y-3">
              {data.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.details}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleDateString(
                        "ru-RU"
                      )}{" "}
                      {new Date(activity.created_at).toLocaleTimeString(
                        "ru-RU"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
