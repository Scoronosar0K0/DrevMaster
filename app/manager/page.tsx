"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { PageHeader, StatCard } from "@/components/ui";
import { formatMoney } from "@/lib/format";

interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface ManagerStats {
  totalDebt: number;
  totalWarehouseItems: number;
  pendingTransfers: number;
}

const NAV_TILES: {
  href: string;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    href: "/manager/cash",
    title: "Мои финансы",
    description: "Просмотр долгов и баланса",
    icon: "wallet",
  },
  {
    href: "/manager/warehouse",
    title: "Мой склад",
    description: "Товары для продажи",
    icon: "archive",
  },
  {
    href: "/manager/transfers",
    title: "Переводы",
    description: "Отправка денег администратору",
    icon: "transfer",
  },
];

export default function ManagerDashboard() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<ManagerStats>({
    totalDebt: 0,
    totalWarehouseItems: 0,
    pendingTransfers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserInfo();
    fetchStats();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
      }
    } catch (error) {
      console.error("Ошибка получения информации о пользователе:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/manager/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Ошибка получения статистики:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-center py-24 text-ink-500">
          <span className="loading-spinner mr-3 text-brand-600" />
          <span className="text-sm">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Панель менеджера"
        description={`Добро пожаловать, ${userInfo?.name ?? ""}!`}
      />

      {/* Статистика */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Общий долг"
          value={formatMoney(stats.totalDebt)}
          icon="wallet"
          tone="negative"
        />
        <StatCard
          label="Товары на складе"
          value={stats.totalWarehouseItems}
          icon="archive"
          tone="brand"
        />
        <StatCard
          label="Ожидающие переводы"
          value={stats.pendingTransfers}
          icon="clock"
          tone="warning"
        />
      </div>

      {/* Навигация */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {NAV_TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="card flex items-center gap-4 p-5 transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <div className="rounded-lg bg-ink-100 p-2 text-ink-600">
              <Icon name={tile.icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-ink-900">
                {tile.title}
              </h3>
              <p className="text-sm text-ink-500">{tile.description}</p>
            </div>
            <Icon name="chevronRight" className="h-4 w-4 text-ink-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
