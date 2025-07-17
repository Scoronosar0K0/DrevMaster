"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalBalance: number;
  suppliersCount: number;
}

interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalBalance: 0,
    suppliersCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загрузка статистики и активности
    fetchStats();
    fetchRecentActivities();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch("/api/activity-logs?limit=5");
      const data = await response.json();
      setRecentActivities(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch (error) {
      console.error("Ошибка загрузки активности:", error);
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "создан":
      case "заказ_создан":
        return "📦";
      case "займ_взят":
      case "займ_погашен":
        return "💰";
      case "оплата_транспорта":
        return "🚛";
      case "оплата_пошлины":
      case "оплата_таможни":
        return "🚢";
      case "продажа":
        return "💵";
      case "обновлен":
        return "✏️";
      case "удален":
        return "🗑️";
      case "вход":
        return "🔐";
      default:
        return "📝";
    }
  };

  const getActivityTitle = (log: ActivityLog) => {
    switch (log.action) {
      case "создан":
        if (log.entity_type === "partner") return "Новый партнер";
        if (log.entity_type === "supplier") return "Новый поставщик";
        return "Создан объект";
      case "заказ_создан":
        return "Новый заказ создан";
      case "займ_взят":
        return "Займ получен";
      case "займ_погашен":
        return "Займ погашен";
      case "оплата_транспорта":
        return "Оплата транспорта";
      case "оплата_таможни":
        return "Оплата таможни";
      case "продажа":
        return "Продажа товара";
      default:
        return log.action;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) return "недавно";
    if (diffHours < 24) return `${diffHours} ч назад`;

    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 1) return "вчера";
    if (diffDays < 7) return `${diffDays} дн назад`;

    return date.toLocaleDateString("ru-RU");
  };

  const quickActions = [
    {
      title: "Новый заказ",
      description: "Создать новый заказ",
      href: "/orders",
      icon: "📦",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
    },
    {
      title: "Добавить партнера",
      description: "Зарегистрировать нового партнера",
      href: "/partners",
      icon: "🤝",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50 hover:bg-green-100",
    },
    {
      title: "Операции с кассой",
      description: "Управление финансами",
      href: "/cash",
      icon: "💰",
      color: "from-yellow-500 to-orange-600",
      bgColor: "bg-yellow-50 hover:bg-yellow-100",
    },
    {
      title: "Поставщики",
      description: "Управление поставщиками",
      href: "/suppliers",
      icon: "🏭",
      color: "from-purple-500 to-indigo-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
    },
  ];

  const statCards = [
    {
      title: "Всего заказов",
      value: stats.totalOrders,
      icon: "📦",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    {
      title: "В ожидании",
      value: stats.pendingOrders,
      icon: "⏳",
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
    },
    {
      title: "Баланс",
      value: `$${stats.totalBalance.toLocaleString()}`,
      icon: "💰",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "Поставщики",
      value: stats.suppliersCount,
      icon: "🏭",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-8 sm:mb-12 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Добро пожаловать в{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              DrevMaster
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl">
            Система управления деревообрабатывающим бизнесом
          </p>
        </div>

        {/* Статистические карточки */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {statCards.map((card, index) => (
            <div
              key={card.title}
              className={`${card.bgColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: "slideInUp 0.6s ease-out forwards",
              }}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${card.color} rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-lg`}
                >
                  {card.icon}
                </div>
              </div>
              <div>
                <h3
                  className={`text-xs sm:text-sm font-medium ${card.textColor} mb-1 sm:mb-2`}
                >
                  {card.title}
                </h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Быстрые действия */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center sm:text-left">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={action.title}
                href={action.href}
                className={`${action.bgColor} rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/50 backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-2 hover:shadow-lg group`}
                style={{
                  animationDelay: `${(index + 4) * 100}ms`,
                  animation: "slideInUp 0.6s ease-out forwards",
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${action.color} rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-3 sm:mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {action.icon}
                  </div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                    {action.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Последние активности */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-0">
              Последние активности
            </h2>
            <Link
              href="/history"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors self-start sm:self-auto"
            >
              Смотреть все
              <svg
                className="ml-1 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-white/50 p-4 sm:p-6 space-y-3 sm:space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">
                  Загрузка активности...
                </span>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📈</div>
                <p className="text-gray-500">
                  Активность пока не зафиксирована
                </p>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: "slideInUp 0.6s ease-out forwards",
                  }}
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg sm:text-xl">
                      {getActivityIcon(activity.action)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium text-gray-900">
                      {getActivityTitle(activity)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {activity.details ||
                        `${activity.user_name || "Система"} выполнил действие`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
