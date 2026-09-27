"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import { FeedbackHost } from "@/components/feedback";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  partner: "Партнер",
  user: "Пользователь",
};

// Меню повторяет правила доступа из middleware.ts
function getMenu(role: string): NavGroup[] {
  if (role === "manager") {
    return [
      {
        title: "Обзор",
        items: [{ href: "/manager", label: "Главная", icon: "home" }],
      },
      {
        title: "Работа",
        items: [
          { href: "/manager/warehouse", label: "Мой склад", icon: "archive" },
          { href: "/manager/cash", label: "Мои финансы", icon: "wallet" },
          { href: "/manager/transfers", label: "Переводы", icon: "transfer" },
          { href: "/manager-transfers", label: "Перевод партнеру", icon: "users" },
        ],
      },
      {
        title: "Система",
        items: [{ href: "/settings", label: "Настройки", icon: "settings" }],
      },
    ];
  }

  const isAdmin = role === "admin";
  return [
    {
      title: "Обзор",
      items: [
        { href: "/", label: "Главная", icon: "home" },
        ...(isAdmin
          ? [{ href: "/analytics", label: "Аналитика", icon: "chart" as const }]
          : []),
      ],
    },
    {
      title: "Операции",
      items: [
        { href: "/orders", label: "Заказы", icon: "cube" },
        { href: "/cash", label: "Касса", icon: "wallet" },
        { href: "/partners", label: "Партнеры", icon: "users" },
        { href: "/suppliers", label: "Поставщики", icon: "building" },
        ...(isAdmin
          ? [{ href: "/managers", label: "Менеджеры", icon: "user" as const }]
          : []),
      ],
    },
    {
      title: "Система",
      items: [
        { href: "/history", label: "История", icon: "clock" },
        { href: "/settings", label: "Настройки", icon: "settings" },
      ],
    },
  ];
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
        DM
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold text-white">DrevMaster</div>
        <div className="text-[11px] text-ink-400">Торговля древесиной</div>
      </div>
    </div>
  );
}

export default function Navigation({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith("/login");

  useEffect(() => {
    if (isLoginPage) return;
    try {
      const userData = localStorage.getItem("drevmaster_user");
      if (userData) setUser(JSON.parse(userData));
    } catch {
      // поврежденные данные — дождемся ответа сервера
    }
    // Роль и имя берем с сервера: localStorage может быть устаревшим
    fetch("/api/auth/me")
      .then(async (r) => {
        // 401: учетную запись удалили, деактивировали или сменили роль —
        // завершаем сессию, иначе все запросы страницы будут отклоняться
        if (r.status === 401) {
          await fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
          localStorage.removeItem("drevmaster_user");
          window.location.href = "/login";
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("drevmaster_user", JSON.stringify(data.user));
        }
      })
      .catch(() => {});
  }, [isLoginPage]);

  // Закрываем мобильное меню при изменении маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return (
      <>
        {children}
        <FeedbackHost />
      </>
    );
  }

  const menu = user ? getMenu(user.role) : [];
  const homeHref = user?.role === "manager" ? "/manager" : "/";

  const isActive = (href: string) =>
    href === "/" || href === "/manager"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
    } catch (error) {
      console.error("Ошибка выхода:", error);
    }
    localStorage.removeItem("drevmaster_user");
    localStorage.removeItem("drevmaster_token");
    // Полная перезагрузка сбрасывает клиентский кэш страниц прошлой сессии
    window.location.href = "/login";
  };

  const initials = (user?.name || user?.username || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-950">
      <div className="flex h-16 items-center px-5">
        <Link href={homeHref}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {menu.map((group) => (
          <div key={group.title}>
            <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-500">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-ink-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-5 w-5 ${active ? "text-brand-200" : "text-ink-400"}`}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-ink-200">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {user.name || user.username}
              </div>
              <div className="truncate text-xs text-ink-400">
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Выйти"
              aria-label="Выйти"
              className="rounded-md p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Боковая панель для десктопа */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        {sidebar}
      </aside>

      {/* Верхняя панель для мобильных */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-800 bg-ink-950 px-4 lg:hidden">
        <Link href={homeHref}>
          <Logo />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-md p-2 text-ink-300 hover:bg-white/5 hover:text-white"
          aria-label="Открыть меню"
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </header>

      {/* Выдвижное меню для мобильных */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/60 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-fadeIn">
            {sidebar}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-ink-400 hover:bg-white/5 hover:text-white"
              aria-label="Закрыть меню"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <main className="lg:pl-64">{children}</main>
      <FeedbackHost />
    </div>
  );
}
