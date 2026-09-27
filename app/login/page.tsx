"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Проверяем сохраненные данные при загрузке
  useEffect(() => {
    const savedUsername = localStorage.getItem("drevmaster_username");
    const savedRememberMe =
      localStorage.getItem("drevmaster_remember") === "true";

    if (savedUsername && savedRememberMe) {
      setFormData((prev) => ({
        ...prev,
        username: savedUsername,
        rememberMe: savedRememberMe,
      }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Запоминаем только логин. Сам токен хранится в httpOnly-cookie
        if (formData.rememberMe) {
          localStorage.setItem("drevmaster_username", formData.username);
          localStorage.setItem("drevmaster_remember", "true");
        } else {
          localStorage.removeItem("drevmaster_username");
          localStorage.removeItem("drevmaster_remember");
        }
        localStorage.removeItem("drevmaster_token");

        // Сохраняем информацию о пользователе
        localStorage.setItem("drevmaster_user", JSON.stringify(data.user));

        // Полная загрузка вместо router.push: клиентский кэш мог запомнить
        // редиректы на /login, сделанные до входа
        window.location.href = data.user?.role === "manager" ? "/manager" : "/";
      } else {
        setError(data.error);
        setLoading(false);
      }
    } catch (error) {
      console.error("Ошибка входа:", error);
      setError("Ошибка подключения к серверу");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Информационная панель */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-ink-950 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
            DM
          </div>
          <span className="text-lg font-semibold text-white">DrevMaster</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Заказы, касса и займы в одном месте
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-300">
            Отслеживайте каждый заказ древесины от оплаты поставщику до
            продажи, контролируйте баланс кассы и задолженности партнеров.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { icon: "cube" as const, label: "Путь заказа", value: "от оплаты до продажи" },
              { icon: "wallet" as const, label: "Баланс", value: "в реальном времени" },
              { icon: "shield" as const, label: "Доступ", value: "по ролям" },
            ].map((item) => (
              <div key={item.label}>
                <Icon name={item.icon} className="h-5 w-5 text-brand-200" />
                <dt className="mt-3 text-xs text-ink-400">{item.label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-white">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative text-xs text-ink-500">
          © {new Date().getFullYear()} DrevMaster
        </div>
      </div>

      {/* Форма входа */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
              DM
            </div>
            <span className="text-lg font-semibold text-ink-900">DrevMaster</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Вход в систему
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Введите логин и пароль вашей учетной записи
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-ink-700"
              >
                Логин
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="input-field h-11"
                placeholder="Например, admin"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-ink-700"
              >
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input-field h-11 pr-11"
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-400 hover:text-ink-600"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} className="h-5 w-5" />
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) =>
                  setFormData({ ...formData, rememberMe: e.target.checked })
                }
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              Запомнить логин на этом устройстве
            </label>

            {error && (
              <div
                role="alert"
                className="animate-shake rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary h-11 w-full"
            >
              {loading && <span className="loading-spinner h-4 w-4" />}
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <p className="mt-8 flex items-center gap-2 text-xs text-ink-400">
            <Icon name="lock" className="h-4 w-4" />
            Доступ только для сотрудников. Сессия действует 7 дней
          </p>
        </div>
      </div>
    </div>
  );
}
