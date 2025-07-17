"use client";
import { useState, useEffect } from "react";

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

export default function HistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.append("action", filterAction);
      if (filterEntityType) params.append("entity_type", filterEntityType);
      if (filterUser) params.append("user", filterUser);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Ошибка загрузки логов:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterAction("");
    setFilterEntityType("");
    setFilterUser("");
    setDateFrom("");
    setDateTo("");
  };

  const applyFilters = () => {
    setLoading(true);
    fetchLogs();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "создан":
        return "➕";
      case "обновлен":
        return "✏️";
      case "удален":
        return "🗑️";
      case "займ_взят":
        return "💰";
      case "займ_погашен":
        return "✅";
      case "заказ_создан":
        return "📦";
      case "оплата_транспорта":
        return "🚛";
      case "оплата_пошлины":
        return "🚢";
      case "продажа":
        return "💵";
      case "вход":
        return "🔐";
      case "очистка_бд":
        return "🗃️";
      default:
        return "📝";
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case "создан":
        return "Создан";
      case "обновлен":
        return "Обновлен";
      case "удален":
        return "Удален";
      case "займ_взят":
        return "Займ взят";
      case "займ_погашен":
        return "Займ погашен";
      case "заказ_создан":
        return "Заказ создан";
      case "оплата_транспорта":
        return "Оплата транспорта";
      case "оплата_пошлины":
        return "Оплата пошлины";
      case "продажа":
        return "Продажа";
      case "вход":
        return "Вход в систему";
      case "очистка_бд":
        return "Очистка БД";
      default:
        return action;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "partner":
        return "🤝";
      case "supplier":
        return "🏭";
      case "order":
        return "📦";
      case "loan":
        return "💰";
      case "sale":
        return "💵";
      case "user":
        return "👤";
      case "auth":
        return "🔐";
      case "system":
        return "🔧";
      default:
        return "📄";
    }
  };

  const getEntityText = (entityType: string) => {
    switch (entityType) {
      case "partner":
        return "Партнер";
      case "supplier":
        return "Поставщик";
      case "order":
        return "Заказ";
      case "loan":
        return "Займ";
      case "sale":
        return "Продажа";
      case "user":
        return "Пользователь";
      case "auth":
        return "Аутентификация";
      case "system":
        return "Система";
      default:
        return entityType;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "создан":
        return "bg-green-100 text-green-800 border-green-200";
      case "обновлен":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "удален":
        return "bg-red-100 text-red-800 border-red-200";
      case "займ_взят":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "займ_погашен":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "заказ_создан":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "продажа":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "вход":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                📈 История активности
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Отслеживание всех операций в системе
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl mt-4 sm:mt-0"
            >
              🔍 {showFilters ? "Скрыть фильтры" : "Показать фильтры"}
            </button>
          </div>

          {/* Фильтры */}
          {showFilters && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-slideInDown">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Действие
                  </label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    title="Фильтр по действию"
                  >
                    <option value="">Все действия</option>
                    <option value="создан">Создан</option>
                    <option value="обновлен">Обновлен</option>
                    <option value="удален">Удален</option>
                    <option value="займ_взят">Займ взят</option>
                    <option value="займ_погашен">Займ погашен</option>
                    <option value="заказ_создан">Заказ создан</option>
                    <option value="продажа">Продажа</option>
                    <option value="вход">Вход</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип объекта
                  </label>
                  <select
                    value={filterEntityType}
                    onChange={(e) => setFilterEntityType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    title="Фильтр по типу объекта"
                  >
                    <option value="">Все типы</option>
                    <option value="partner">Партнеры</option>
                    <option value="supplier">Поставщики</option>
                    <option value="order">Заказы</option>
                    <option value="loan">Займы</option>
                    <option value="sale">Продажи</option>
                    <option value="user">Пользователи</option>
                    <option value="auth">Аутентификация</option>
                    <option value="system">Система</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Пользователь
                  </label>
                  <input
                    type="text"
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Имя пользователя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата от
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    title="Дата начала периода"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата до
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    title="Дата окончания периода"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={applyFilters}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Применить фильтры
                </button>
                <button
                  onClick={() => {
                    clearFilters();
                    applyFilters();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Очистить
                </button>
                <div className="text-sm text-gray-500 self-center">
                  Найдено записей: {logs.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* История активности */}
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl sm:text-8xl mb-4">📈</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет записей в истории
            </h3>
            <p className="text-gray-500">
              {filterAction ||
              filterEntityType ||
              filterUser ||
              dateFrom ||
              dateTo
                ? "Попробуйте изменить фильтры поиска"
                : "Активность пока не зафиксирована"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div
                key={log.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "slideInUp 0.6s ease-out forwards",
                }}
              >
                <div className="flex items-start space-x-4">
                  {/* Иконка действия */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                    </div>
                  </div>

                  {/* Содержимое */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(
                            log.action
                          )}`}
                        >
                          {getActionText(log.action)}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {getEntityIcon(log.entity_type)}{" "}
                          {getEntityText(log.entity_type)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          👤 {log.user_name}
                        </span>
                        <span className="flex items-center">
                          🕒 {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Детали */}
                    {log.details && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{log.details}</p>
                      </div>
                    )}

                    {/* ID объекта */}
                    {log.entity_id && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-400">
                          ID: {log.entity_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Пагинация или "Загрузить еще" можно добавить здесь */}
        {logs.length > 50 && (
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Показано последних {logs.length} записей
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
