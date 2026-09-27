"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { notify, confirmAction } from "@/components/feedback";

const SEARCH_PATH = "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z";
const EDIT_PATH =
  "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const TRASH_PATH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

interface User {
  id: number;
  username: string;
  role: "admin" | "partner" | "user";
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "users" | "system">(
    "profile"
  );
  const [clearDBPassword, setClearDBPassword] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "user" as "admin" | "partner" | "user",
    name: "",
    email: "",
    phone: "",
  });

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Защита от повторного нажатия: пока запрос выполняется, повторный вызов
  // игнорируется (иначе двойной клик проводил бы оплату или продажу дважды)
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const guard =
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
    async (...args: A) => {
      const event = args[0] as { preventDefault?: () => void } | undefined;
      event?.preventDefault?.();
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        await fn(...args);
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    };

  useEffect(() => {
    fetchUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem("drevmaster_user");
    if (userData) {
      setCurrentUser(JSON.parse(userData));
      const user = JSON.parse(userData);
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      // Список пользователей доступен только администратору
      const storedUser = localStorage.getItem("drevmaster_user");
      if (storedUser && JSON.parse(storedUser).role !== "admin") return;

      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchUsers();
        resetForm();
        notify.success(editingUser ? "Пользователь обновлен" : "Пользователь создан");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при сохранении");
    }
  });

  const handleProfileSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      profileData.newPassword &&
      profileData.newPassword !== profileData.confirmPassword
    ) {
      notify.error("Новые пароли не совпадают");
      return;
    }

    try {
      const response = await fetch(`/api/users/${currentUser?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          ...(profileData.newPassword && {
            currentPassword: profileData.currentPassword,
            password: profileData.newPassword,
          }),
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        localStorage.setItem("drevmaster_user", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setProfileData({
          ...profileData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        notify.success("Профиль обновлен");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при обновлении профиля");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при обновлении профиля");
    }
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "user",
      name: "",
      email: "",
      phone: "",
    });
    setShowAddForm(false);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
    });
    setEditingUser(user);
    setShowAddForm(true);
  };

  const handleDelete = guard(async (id: number) => {
    if (!await confirmAction("Вы уверены, что хотите удалить пользователя?", { danger: true })) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
        notify.success("Пользователь удален");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при удалении");
    }
  });

  const toggleUserStatus = guard(async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${id}/toggle-active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        fetchUsers();
        notify.success(
          `Пользователь ${!currentStatus ? "активирован" : "деактивирован"}`
        );
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при изменении статуса");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при изменении статуса");
    }
  });

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Администратор";
      case "manager":
        return "Менеджер";
      case "partner":
        return "Партнер";
      case "user":
        return "Пользователь";
      default:
        return role;
    }
  };

  // Короткая метка роли для узких экранов
  const getRoleShort = (role: string) => {
    switch (role) {
      case "admin":
        return "А";
      case "manager":
        return "М";
      case "partner":
        return "П";
      default:
        return "У";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-50 text-red-700";
      case "manager":
        return "bg-brand-50 text-brand-700";
      case "partner":
        return "bg-emerald-50 text-emerald-700";
      case "user":
        return "bg-ink-100 text-ink-700";
      default:
        return "bg-ink-100 text-ink-700";
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const tabClass = (tab: "profile" | "users" | "system") =>
    `-mb-px whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
      activeTab === tab
        ? "border-brand-600 text-ink-900"
        : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700"
    }`;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-center py-24 text-ink-500">
          <span className="loading-spinner mr-3 text-brand-600" />
          <span className="text-sm">Загрузка настроек...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Настройки"
        description="Управление профилем и системными настройками"
      />

      {/* Вкладки */}
      <div className="mb-6 overflow-x-auto">
        <nav className="flex w-max min-w-full gap-6 border-b border-ink-200">
          <button
            onClick={() => setActiveTab("profile")}
            className={tabClass("profile")}
          >
            Мой профиль
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveTab("users")}
              className={tabClass("users")}
            >
              Пользователи
            </button>
          )}
          <button
            onClick={() => setActiveTab("system")}
            className={tabClass("system")}
          >
            Система
          </button>
        </nav>
      </div>

      {/* Содержимое вкладок */}
      {activeTab === "profile" && currentUser && (
        <section className="card p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xl font-semibold text-white">
              {currentUser.name[0]?.toUpperCase() ||
                currentUser.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink-900">
                {currentUser.name}
              </h2>
              <p className="text-sm text-ink-500">@{currentUser.username}</p>
              <span
                className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(
                  currentUser.role
                )}`}
              >
                {getRoleText(currentUser.role)}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Имя
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  className="input-field"
                  placeholder="Ваше имя"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  className="input-field"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  className="input-field"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>

            <div className="border-t border-ink-100 pt-6">
              <h3 className="mb-4 text-base font-semibold text-ink-900">
                Изменить пароль
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    value={profileData.currentPassword}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        currentPassword: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Введите текущий пароль"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    value={profileData.newPassword}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        newPassword: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Новый пароль"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Подтвердите пароль
                  </label>
                  <input
                    type="password"
                    value={profileData.confirmPassword}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Повторите новый пароль"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button disabled={submitting} type="submit" className="btn btn-primary">
                Сохранить изменения
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "users" && currentUser?.role === "admin" && (
        <div className="space-y-4">
          {/* Заголовок и кнопка добавления */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink-900">
                Управление пользователями
              </h2>
              <p className="text-sm text-ink-500">
                Создание и редактирование учетных записей
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              <Icon name="plus" className="h-4 w-4" />
              Добавить пользователя
            </button>
          </div>

          {/* Поиск */}
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-ink-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={SEARCH_PATH}
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск пользователей..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          {/* Список пользователей */}
          <div className="card overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                  <Icon name="users" className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-ink-900">
                  {searchTerm
                    ? "Пользователи не найдены"
                    : "Нет пользователей"}
                </h3>
                <p className="mt-1 text-sm text-ink-500">
                  {searchTerm
                    ? "Попробуйте изменить поисковый запрос"
                    : "Создайте первого пользователя для начала работы"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-ink-50">
                    <tr className="text-xs font-medium uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-3 text-left font-medium sm:px-5">
                        Пользователь
                      </th>
                      <th className="px-3 py-3 text-left font-medium sm:px-5">
                        Роль
                      </th>
                      <th className="hidden px-3 py-3 text-left font-medium sm:table-cell sm:px-5">
                        Контакты
                      </th>
                      <th className="px-3 py-3 text-left font-medium sm:px-5">
                        Статус
                      </th>
                      <th className="px-3 py-3 text-right font-medium sm:px-5">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-ink-50">
                        <td className="whitespace-nowrap px-3 py-3 sm:px-5">
                          <div className="flex items-center">
                            <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700 sm:mr-3 sm:h-9 sm:w-9 sm:text-sm">
                              {user.name[0]?.toUpperCase() ||
                                user.username[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium text-ink-900 sm:text-sm">
                                {user.name}
                              </div>
                              <div className="truncate text-xs text-ink-500">
                                @{user.username}
                              </div>
                              {/* Показываем контакты на мобильных */}
                              <div className="mt-1 text-xs text-ink-500 sm:hidden">
                                {user.email && <div>{user.email}</div>}
                                {user.phone && <div>{user.phone}</div>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 sm:px-5">
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium sm:px-2.5 ${getRoleColor(
                              user.role
                            )}`}
                          >
                            <span className="hidden sm:inline">
                              {getRoleText(user.role)}
                            </span>
                            <span className="sm:hidden">
                              {getRoleShort(user.role)}
                            </span>
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-ink-500 sm:table-cell sm:px-5">
                          <div>
                            {user.email && <div>{user.email}</div>}
                            {user.phone && <div>{user.phone}</div>}
                            {!user.email && !user.phone && (
                              <span className="text-ink-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 sm:px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium sm:px-2.5 ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                            title={user.is_active ? "Активен" : "Неактивен"}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current sm:hidden" />
                            <span className="hidden sm:inline">
                              {user.is_active ? "Активен" : "Неактивен"}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm sm:px-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(user)}
                              className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                              title="Редактировать"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.8}
                                  d={EDIT_PATH}
                                />
                              </svg>
                            </button>
                            {user.id !== currentUser?.id && (
                            <button
                              onClick={() =>
                                toggleUserStatus(user.id, user.is_active)
                              }
                              className={`rounded-lg p-1.5 text-ink-400 transition-colors ${
                                user.is_active
                                  ? "hover:bg-amber-50 hover:text-amber-600"
                                  : "hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                              title={
                                user.is_active
                                  ? "Деактивировать"
                                  : "Активировать"
                              }
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                {user.is_active ? (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.8}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                ) : (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.8}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                )}
                              </svg>
                            </button>
                            )}
                            {/* Свою учетную запись нельзя деактивировать или удалить */}
                            {user.id !== currentUser?.id && (
                              <button
                                disabled={submitting}
                                onClick={() => handleDelete(user.id)}
                                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Удалить"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.8}
                                    d={TRASH_PATH}
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "system" && (
        <section className="card p-6">
          <h2 className="mb-6 text-base font-semibold text-ink-900">
            Системные настройки
          </h2>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            {/* Информация о системе */}
            <div className="rounded-lg border border-ink-200">
              <h3 className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">
                Информация о системе
              </h3>
              <dl className="divide-y divide-ink-100 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-ink-500">Версия</dt>
                  <dd className="font-medium text-ink-900">
                    DrevMaster v1.0.0
                  </dd>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-ink-500">База данных</dt>
                  <dd className="font-medium text-ink-900">SQLite</dd>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <dt className="text-ink-500">Пользователей</dt>
                  <dd className="font-medium text-ink-900">{users.length}</dd>
                </div>
              </dl>
            </div>

            {/* Опасная зона */}
            {currentUser?.role === "admin" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-semibold text-red-800">
                  Опасная зона
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  Данные действия необратимы. Будьте осторожны!
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <input
                      type="password"
                      value={clearDBPassword}
                      onChange={(e) => setClearDBPassword(e.target.value)}
                      placeholder="Ваш пароль администратора"
                      className="input-field border-red-200 text-sm hover:border-red-300 focus:border-red-500 focus:ring-red-100"
                    />
                    <p className="mt-1.5 text-xs text-red-700">
                      Подтвердите паролем вашей учетной записи администратора
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (
                        await confirmAction(
                          "Вы уверены, что хотите очистить всю базу данных? Это действие необратимо!",
                          { danger: true }
                        )
                      ) {
                        try {
                          const response = await fetch(
                            "/api/admin/clear-database",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                password: clearDBPassword,
                              }),
                            }
                          );
                          if (response.ok) {
                            // Администратор пересоздан с тем же паролем —
                            // показываем сообщение сервера и входим заново
                            const data = await response.json().catch(() => ({}));
                            notify.success(data.message || "База данных очищена");
                            setClearDBPassword("");
                            setTimeout(() => {
                              window.location.href = "/login";
                            }, 2500);
                          } else {
                            const error = await response.json();
                            notify.error(
                              error.error || "Ошибка при очистке базы данных"
                            );
                          }
                        } catch (error) {
                          notify.error("Ошибка при очистке базы данных");
                        }
                      }
                    }}
                    disabled={!clearDBPassword}
                    className="btn btn-danger w-full"
                  >
                    Очистить базу данных
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Модальное окно формы пользователя */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  {editingUser
                    ? "Редактировать пользователя"
                    : "Добавить пользователя"}
                </h3>
                <button
                  onClick={resetForm}
                  className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-field"
                    placeholder="Полное имя"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Логин *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="input-field"
                    placeholder="Логин пользователя"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Пароль{" "}
                    {editingUser ? "(оставьте пустым, чтобы не менять)" : "*"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="input-field"
                    placeholder="Пароль"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Роль *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "admin" | "partner" | "user",
                      })
                    }
                    className="input-field"
                    title="Выберите роль пользователя"
                  >
                    <option value="user">Пользователь</option>
                    <option value="partner">Партнер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-field"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="input-field"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button disabled={submitting} type="submit" className="btn btn-primary flex-1">
                    {editingUser ? "Обновить" : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
