"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string;
}

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("drevmaster_user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Закрываем мобильное меню при изменении маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const menuItems = [
    { href: "/", label: "Главная", icon: "🏠" },
    { href: "/partners", label: "Партнеры", icon: "🤝" },
    { href: "/cash", label: "Касса", icon: "💰" },
    { href: "/suppliers", label: "Поставщики", icon: "🏭" },
    { href: "/orders", label: "Заказы", icon: "📦" },
    ...(user?.role === "admin"
      ? [
          { href: "/managers", label: "Менеджеры", icon: "👥" },
          { href: "/analytics", label: "Аналитика", icon: "📊" },
        ]
      : []),
    ...(user?.role === "manager"
      ? [{ href: "/manager-transfers", label: "Переводы", icon: "💸" }]
      : []),
    { href: "/settings", label: "Настройки", icon: "⚙️" },
    { href: "/history", label: "История", icon: "📈" },
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/login", { method: "DELETE" });
      localStorage.removeItem("drevmaster_user");
      localStorage.removeItem("drevmaster_token");
      router.push("/login");
    } catch (error) {
      console.error("Ошибка выхода:", error);
    }
  };

  return (
    <>
      {/* Основная навигация */}
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Логотип */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  D
                </div>
                <span className="text-xl font-bold text-gray-900">
                  DrevMaster
                </span>
              </Link>
            </div>

            {/* Десктопное меню */}
            <div className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isActive(item.href)
                      ? "bg-blue-100 text-blue-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Пользователь и мобильное меню */}
            <div className="flex items-center space-x-3">
              {/* Пользователь */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.name
                        ? user.name[0].toUpperCase()
                        : user.username[0].toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || user.username}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {user.role}
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        showUserMenu ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Выпадающее меню пользователя */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-gray-200 z-50 animate-slideInDown">
                      <div className="p-3 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || user.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email}
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          ⚙️ Настройки
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          🚪 Выйти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Кнопка мобильного меню */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                title="Открыть меню"
              >
                <svg
                  className={`w-6 h-6 transition-transform ${
                    isMobileMenuOpen ? "rotate-45" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Мобильное меню */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "max-h-screen opacity-100 visible"
              : "max-h-0 opacity-0 invisible overflow-hidden"
          }`}
        >
          <div className="px-4 pt-2 pb-4 space-y-1 bg-gray-50 border-t border-gray-200">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "text-gray-700 hover:text-gray-900 hover:bg-white"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
                {isActive(item.href) && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Оверлей для закрытия меню */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Обработчик клика вне меню пользователя */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
}
