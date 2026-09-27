"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { PageHeader, StatCard } from "@/components/ui";
import { formatMoney, parseDbDate } from "@/lib/format";

interface PipelineRow {
  status: string;
  count: number;
  total: number;
}

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalBalance: number;
  suppliersCount: number;
  pipeline: PipelineRow[];
  partnerLoans: number;
  managerDebt: number;
}

interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  details?: string;
  created_at: string;
}

// Этапы заказа в порядке движения товара
const STAGES: { status: string; label: string; hint: string; icon: IconName }[] = [
  { status: "loan", label: "Не оплачено", hint: "Загрузка в долг", icon: "clock" },
  { status: "paid", label: "Оплачен", hint: "Ждет контейнер", icon: "wallet" },
  { status: "in_container", label: "В контейнере", hint: "Ждет оплаты транспорта", icon: "archive" },
  { status: "on_way", label: "В пути", hint: "Ждет таможни", icon: "truck" },
  { status: "warehouse", label: "На складе", hint: "Готов к продаже", icon: "building" },
  { status: "sold", label: "Продан", hint: "Сделка закрыта", icon: "trendUp" },
];

function activityIcon(action: string): IconName {
  if (action.includes("займ")) return "wallet";
  if (action.includes("транспорт")) return "truck";
  if (action.includes("контейнер")) return "archive";
  if (action.includes("продаж")) return "trendUp";
  if (action.includes("перевод") || action.includes("денег")) return "transfer";
  if (action.includes("заказ")) return "cube";
  return "clock";
}

function relativeTime(dateString: string) {
  const date = parseDbDate(dateString) ?? new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then(setStats),
      fetch("/api/activity-logs?limit=6&exclude_action=вход")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setActivities(Array.isArray(data) ? data : [])),
    ])
      .catch((error) => console.error("Ошибка загрузки главной:", error))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const stageData = STAGES.map((stage) => {
    const row = stats?.pipeline?.find((p) => p.status === stage.status);
    return { ...stage, count: row?.count ?? 0, total: row?.total ?? 0 };
  });
  const maxCount = Math.max(1, ...stageData.map((s) => s.count));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Обзор"
        description={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          <>
            <Link href="/cash" className="btn btn-secondary">
              <Icon name="wallet" className="h-4 w-4" />
              Касса
            </Link>
            <Link href="/orders" className="btn btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              Новый заказ
            </Link>
          </>
        }
      />

      {/* Ключевые показатели */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card relative overflow-hidden bg-ink-950 p-5 text-white sm:col-span-2 xl:col-span-1">
          <div className="text-sm font-medium text-ink-300">Баланс кассы</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            {loading ? "—" : formatMoney(stats?.totalBalance)}
          </div>
          <div className="mt-1 text-xs text-ink-400">
            Займы + поступления − расходы
          </div>
        </div>
        <StatCard
          label="Мы должны партнерам"
          value={loading ? "—" : formatMoney(stats?.partnerLoans)}
          hint="Непогашенные займы"
          icon="users"
          tone="negative"
        />
        <StatCard
          label="Нам должны менеджеры"
          value={loading ? "—" : formatMoney(stats?.managerDebt)}
          hint="За товар, переданный на продажу"
          icon="user"
          tone="positive"
        />
        <StatCard
          label="Заказы в работе"
          value={loading ? "—" : stats?.pendingOrders ?? 0}
          hint={loading ? "" : `Всего ${stats?.totalOrders ?? 0} · поставщиков ${stats?.suppliersCount ?? 0}`}
          icon="cube"
          tone="brand"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Путь заказа */}
        <section className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink-900">
                Путь заказа
              </h2>
              <p className="text-xs text-ink-500">
                Сколько заказов сейчас на каждом этапе
              </p>
            </div>
            <Link
              href="/orders"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Все заказы
              <Icon name="chevronRight" className="h-4 w-4" />
            </Link>
          </div>
          <ul className="divide-y divide-ink-100">
            {stageData.map((stage) => (
              <li key={stage.status} className="flex items-center gap-4 px-5 py-3">
                <div className="rounded-lg bg-ink-100 p-2 text-ink-600">
                  <Icon name={stage.icon} className="h-4 w-4" />
                </div>
                <div className="w-32 shrink-0 sm:w-40">
                  <div className="text-sm font-medium text-ink-900">
                    {stage.label}
                  </div>
                  <div className="text-xs text-ink-500">{stage.hint}</div>
                </div>
                <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-ink-100 sm:block">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(stage.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="ml-auto w-24 text-right">
                  <div className="text-sm font-semibold text-ink-900">
                    {stage.count}
                  </div>
                  <div className="text-xs text-ink-500">
                    {formatMoney(stage.total)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Последние операции */}
        <section className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">
              Последние операции
            </h2>
            <Link
              href="/history"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              История
              <Icon name="chevronRight" className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-100" />
              ))}
            </div>
          ) : activities.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {activities.map((activity) => (
                <li key={activity.id} className="flex gap-3 px-5 py-3">
                  <div className="mt-0.5 rounded-lg bg-ink-100 p-1.5 text-ink-500">
                    <Icon name={activityIcon(activity.action)} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-ink-800">
                      {activity.details || activity.action}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {activity.user_name ? `${activity.user_name} · ` : ""}
                      {relativeTime(activity.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-ink-500">
              Операций пока нет
            </div>
          )}
        </section>
      </div>

      {/* Быстрые действия */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: "/orders", label: "Создать заказ", icon: "cube" as const },
          { href: "/cash", label: "Взять займ", icon: "wallet" as const },
          { href: "/partners", label: "Добавить партнера", icon: "users" as const },
          { href: "/suppliers", label: "Поставщики", icon: "building" as const },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="card flex items-center gap-3 p-4 text-sm font-medium text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <Icon name={action.icon} className="h-5 w-5 text-ink-400" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
