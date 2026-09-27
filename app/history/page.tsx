"use client";
import { useState, useEffect } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { parseDbDate } from "@/lib/format";

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

  // Начало местных суток в UTC ('YYYY-MM-DD HH:MM:SS'), как даты в базе.
  // Так фильтр совпадает с датами, которые пользователь видит в списке
  const localDayStartUtc = (day: string, addDays = 0) => {
    const date = new Date(day + "T00:00");
    date.setDate(date.getDate() + addDays);
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  const fetchLogs = async (
    filters = { filterAction, filterEntityType, filterUser, dateFrom, dateTo }
  ) => {
    try {
      const params = new URLSearchParams();
      if (filters.filterAction) params.append("action", filters.filterAction);
      if (filters.filterEntityType)
        params.append("entity_type", filters.filterEntityType);
      if (filters.filterUser) params.append("user", filters.filterUser);
      if (filters.dateFrom)
        params.append("created_from", localDayStartUtc(filters.dateFrom));
      if (filters.dateTo)
        params.append("created_before", localDayStartUtc(filters.dateTo, 1));

      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
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
    // Запрашиваем без фильтров сразу: состояние обновится только после рендера
    setLoading(true);
    fetchLogs({
      filterAction: "",
      filterEntityType: "",
      filterUser: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const applyFilters = () => {
    setLoading(true);
    fetchLogs();
  };

  // Иконка по типу операции (как на главной)
  const getActionIcon = (action: string): IconName => {
    if (action.includes("займ")) return "wallet";
    if (action.includes("транспорт")) return "truck";
    if (action.includes("контейнер")) return "archive";
    if (action.includes("продаж")) return "trendUp";
    if (action.includes("перевод") || action.includes("денег")) return "transfer";
    if (action.includes("заказ")) return "cube";
    if (action === "вход") return "lock";
    return "clock";
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
      case "займ_погашен":
      case "продажа":
        return "status-success";
      case "обновлен":
      case "заказ_создан":
        return "status-info";
      case "удален":
        return "status-danger";
      case "займ_взят":
        return "status-warning";
      default:
        return "bg-ink-100 text-ink-700";
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseDbDate(dateString) ?? new Date(dateString);
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
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"></div>
          <p className="mt-3 text-sm text-ink-500">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="История активности"
        description="Отслеживание всех операций в системе"
        actions={
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            {showFilters ? "Скрыть фильтры" : "Показать фильтры"}
          </button>
        }
      />

      {/* Фильтры */}
      {showFilters && (
        <div className="card mb-6 p-5 animate-slideInDown">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Действие
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="input-field"
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
                <option value="продажа_менеджера">Продажа менеджера</option>
                <option value="оплата_займа">Оплата займа</option>
                <option value="обработка_перевода">Обработка перевода</option>
                <option value="создание_расхода">Расход</option>
                <option value="создание_поступления">Поступление</option>
                <option value="вход">Вход</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Тип объекта
              </label>
              <select
                value={filterEntityType}
                onChange={(e) => setFilterEntityType(e.target.value)}
                className="input-field"
                title="Фильтр по типу объекта"
              >
                <option value="">Все типы</option>
                <option value="partner">Партнеры</option>
                <option value="supplier">Поставщики</option>
                <option value="order">Заказы</option>
                <option value="loan">Займы</option>
                <option value="expense">Расходы</option>
                <option value="income">Поступления</option>
                <option value="manager">Менеджеры</option>
                <option value="manager_sale">Продажи менеджеров</option>
                <option value="transfer">Переводы</option>
                <option value="user">Пользователи</option>
                <option value="auth">Аутентификация</option>
                <option value="system">Система</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Пользователь
              </label>
              <input
                type="text"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="input-field"
                placeholder="Имя пользователя"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Дата от
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field"
                title="Дата начала периода"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                Дата до
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field"
                title="Дата окончания периода"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={applyFilters} className="btn btn-primary">
              Применить фильтры
            </button>
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              Очистить
            </button>
            <div className="text-sm text-ink-500 sm:ml-auto">
              Найдено записей: {logs.length}
            </div>
          </div>
        </div>
      )}

      {/* История активности */}
      {logs.length === 0 ? (
        <div className="card px-5 py-12 text-center">
          <div className="mx-auto mb-3 w-fit rounded-lg bg-ink-100 p-2 text-ink-600">
            <Icon name="clock" className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-medium text-ink-900">
            Нет записей в истории
          </h3>
          <p className="mt-1 text-sm text-ink-500">
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
        <div className="card">
          <ul className="divide-y divide-ink-100">
            {logs.map((log) => (
              <li key={log.id} className="flex gap-3 px-5 py-4">
                {/* Иконка действия */}
                <div className="mt-0.5 shrink-0 self-start rounded-lg bg-ink-100 p-2 text-ink-600">
                  <Icon name={getActionIcon(log.action)} className="h-4 w-4" />
                </div>

                {/* Содержимое */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-badge ${getActionColor(log.action)}`}>
                        {getActionText(log.action)}
                      </span>
                      <span className="status-badge bg-ink-100 text-ink-700">
                        {getEntityText(log.entity_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1">
                        <Icon name="user" className="h-3.5 w-3.5" />
                        {log.user_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="clock" className="h-3.5 w-3.5" />
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Детали */}
                  {log.details && (
                    <p className="mt-2 text-sm text-ink-700">{log.details}</p>
                  )}

                  {/* ID объекта */}
                  {log.entity_id && (
                    <p className="mt-1 text-xs text-ink-400">
                      ID: {log.entity_id}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Пагинация или "Загрузить еще" можно добавить здесь */}
      {logs.length > 50 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-500">
            Показано последних {logs.length} записей
          </p>
        </div>
      )}
    </div>
  );
}
