"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { notify, confirmAction } from "@/components/feedback";

const SEARCH_PATH = "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z";
const EDIT_PATH =
  "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const TRASH_PATH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

interface Manager {
  id: number;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  debt: number;
}

interface Transfer {
  id: number;
  from_manager_id: number;
  from_manager_name: string;
  from_manager_username: string;
  to_user_id: number;
  to_user_name: string;
  amount: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_by?: number;
  approved_by_name?: string;
  approved_at?: string;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTakeMoneyDialog, setShowTakeMoneyDialog] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    phone: "",
    is_active: true,
  });

  const [editForm, setEditForm] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    is_active: true,
  });

  const [takeMoneyForm, setTakeMoneyForm] = useState({
    amount: 0,
    description: "",
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
    fetchManagers();
    fetchTransfers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/managers");
      const data = await response.json();
      setManagers(data);
    } catch (error) {
      console.error("Ошибка загрузки менеджеров:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await fetch("/api/admin/manager-transfers");
      const data = await response.json();
      setTransfers(data);
    } catch (error) {
      console.error("Ошибка загрузки переводов:", error);
    } finally {
      setTransfersLoading(false);
    }
  };

  const handleTransferAction = guard(async (
    transferId: number,
    status: "approved" | "rejected"
  ) => {
    try {
      const response = await fetch("/api/admin/manager-transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transferId, status }),
      });

      if (response.ok) {
        notify.success(status === "approved" ? "Перевод одобрен!" : "Перевод отклонен!");
        fetchTransfers(); // Обновляем список
        fetchManagers(); // Долг менеджера изменился
      } else {
        notify.error("Ошибка при обработке перевода");
      }
    } catch (error) {
      console.error("Ошибка при обработке перевода:", error);
      notify.error("Ошибка при обработке перевода");
    }
  });

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingManager
        ? `/api/managers/${editingManager.id}`
        : "/api/managers";

      const method = editingManager ? "PUT" : "POST";

      const submitData =
        editingManager && !formData.password
          ? { ...formData, password: undefined } // Не отправляем пустой пароль при редактировании
          : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        fetchManagers();
        resetForm();
        notify.success(editingManager ? "Менеджер обновлен" : "Менеджер создан");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при сохранении");
    }
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      is_active: true,
    });
    setShowAddForm(false);
    setEditingManager(null);
  };

  const handleEdit = (manager: Manager) => {
    setFormData({
      username: manager.username,
      password: "", // Не показываем текущий пароль
      name: manager.name,
      email: manager.email || "",
      phone: manager.phone || "",
      is_active: manager.is_active,
    });
    setEditingManager(manager);
    setShowAddForm(true);
  };

  const handleDelete = guard(async (id: number) => {
    if (!await confirmAction("Вы уверены, что хотите удалить менеджера?", { danger: true })) return;

    try {
      const response = await fetch(`/api/managers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchManagers();
        notify.success("Менеджер удален");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при удалении");
    }
  });

  const toggleActive = guard(async (manager: Manager) => {
    try {
      const response = await fetch(`/api/managers/${manager.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...manager,
          is_active: !manager.is_active,
        }),
      });

      if (response.ok) {
        fetchManagers();
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при обновлении статуса");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при обновлении статуса");
    }
  });

  const handleTakeMoney = guard(async () => {
    if (!selectedManager || takeMoneyForm.amount <= 0) {
      notify.error("Выберите менеджера и укажите сумму");
      return;
    }

    try {
      const response = await fetch("/api/admin/take-money-from-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manager_id: selectedManager.id,
          amount: takeMoneyForm.amount,
          description:
            takeMoneyForm.description || "Взятие денег администратором",
        }),
      });

      if (response.ok) {
        notify.success("Деньги успешно взяты у менеджера");
        setShowTakeMoneyDialog(false);
        setSelectedManager(null);
        setTakeMoneyForm({ amount: 0, description: "" });
        fetchManagers();
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка взятия денег:", error);
      notify.error("Ошибка взятия денег");
    }
  });

  const filteredManagers = managers.filter(
    (manager) =>
      manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (manager.email &&
        manager.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-center py-24 text-ink-500">
          <span className="loading-spinner mr-3 text-brand-600" />
          <span className="text-sm">Загрузка менеджеров...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Менеджеры"
        description="Управление менеджерами компании"
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Icon name="plus" className="h-4 w-4" />
            Добавить менеджера
          </button>
        }
      />

      {/* Поиск */}
      <div className="relative mb-6 max-w-md">
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
          placeholder="Поиск менеджеров..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Список менеджеров */}
      {filteredManagers.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
            <Icon name="users" className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-ink-900">
            {searchTerm ? "Менеджеры не найдены" : "Нет менеджеров"}
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {searchTerm
              ? "Попробуйте изменить поисковый запрос"
              : "Добавьте первого менеджера для начала работы"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary mt-6"
            >
              <Icon name="plus" className="h-4 w-4" />
              Добавить первого менеджера
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-ink-100 bg-ink-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-500 lg:grid">
            <div className="col-span-3">Менеджер</div>
            <div className="col-span-3">Контакты</div>
            <div className="col-span-2">Статус</div>
            <div className="col-span-2 text-right">Долг</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>
          <ul className="divide-y divide-ink-100">
            {filteredManagers.map((manager) => (
              <li
                key={manager.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-ink-50 lg:grid-cols-12 lg:items-center lg:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3 lg:col-span-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
                    {manager.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-900">
                      {manager.name}
                    </div>
                    <div className="truncate text-xs text-ink-500">
                      @{manager.username}
                    </div>
                    <div className="text-xs text-ink-400">
                      Добавлен {formatDate(manager.created_at)}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5 text-sm text-ink-500 lg:col-span-3">
                  {manager.email && (
                    <div className="truncate">{manager.email}</div>
                  )}
                  {manager.phone && (
                    <div className="truncate">{manager.phone}</div>
                  )}
                  {!manager.email && !manager.phone && (
                    <div className="text-ink-400">—</div>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      manager.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {manager.is_active ? "Активен" : "Неактивен"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 lg:col-span-2 lg:block lg:text-right">
                  <span className="text-xs text-ink-500 lg:hidden">Долг</span>
                  <span
                    className={`text-sm font-semibold ${
                      manager.debt > 0 ? "text-red-600" : "text-ink-400"
                    }`}
                  >
                    {formatMoney(manager.debt)}
                  </span>
                </div>

                <div className="flex items-center gap-1 lg:col-span-2 lg:justify-end">
                  <button
                    disabled={submitting}
                    onClick={() => toggleActive(manager)}
                    className={`rounded-lg p-1.5 text-ink-400 transition-colors ${
                      manager.is_active
                        ? "hover:bg-red-50 hover:text-red-600"
                        : "hover:bg-emerald-50 hover:text-emerald-600"
                    }`}
                    title={
                      manager.is_active ? "Деактивировать" : "Активировать"
                    }
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {manager.is_active ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 6l6 6"
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
                  <button
                    onClick={() => handleEdit(manager)}
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
                  <button
                    onClick={() => {
                      setSelectedManager(manager);
                      setTakeMoneyForm({ amount: 0, description: "" });
                      setShowTakeMoneyDialog(true);
                    }}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                    title="Взять деньги"
                  >
                    <Icon name="wallet" className="h-4 w-4" />
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => handleDelete(manager.id)}
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Секция запросов на переводы */}
      <section className="card mt-8 overflow-hidden">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">
            Запросы на переводы
          </h2>
          <p className="text-xs text-ink-500">
            Заявки от менеджеров на перевод средств
          </p>
        </div>

        {transfersLoading ? (
          <div className="flex items-center justify-center py-10 text-ink-500">
            <span className="loading-spinner mr-3 text-brand-600" />
            <span className="text-sm">Загрузка переводов...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
              <Icon name="transfer" className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-ink-900">
              Нет запросов на переводы
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Все заявки менеджеров на переводы будут отображаться здесь
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-ink-50">
                <tr className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-5 py-3 text-left font-medium">Менеджер</th>
                  <th className="px-5 py-3 text-left font-medium">
                    Получатель
                  </th>
                  <th className="px-5 py-3 text-right font-medium">Сумма</th>
                  <th className="px-5 py-3 text-left font-medium">Описание</th>
                  <th className="px-5 py-3 text-left font-medium">Дата</th>
                  <th className="px-5 py-3 text-left font-medium">Статус</th>
                  <th className="px-5 py-3 text-left font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-ink-50">
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="text-sm font-medium text-ink-900">
                        {transfer.from_manager_name}
                      </div>
                      <div className="text-xs text-ink-500">
                        @{transfer.from_manager_username}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-ink-900">
                      {transfer.to_user_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm font-semibold text-ink-900">
                      {formatMoney(transfer.amount)}
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-sm text-ink-500">
                      {transfer.description || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-ink-500">
                      {formatDate(transfer.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          transfer.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : transfer.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {transfer.status === "pending"
                          ? "Ожидает"
                          : transfer.status === "approved"
                          ? "Одобрен"
                          : "Отклонен"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      {transfer.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleTransferAction(transfer.id, "approved")
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() =>
                              handleTransferAction(transfer.id, "rejected")
                            }
                            className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">
                          {transfer.approved_by_name && (
                            <>Обработал: {transfer.approved_by_name}</>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Модальное окно формы менеджера */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  {editingManager
                    ? "Редактировать менеджера"
                    : "Добавить менеджера"}
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
                    placeholder="Полное имя менеджера"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Имя пользователя *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="input-field"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Пароль{" "}
                    {editingManager
                      ? "(оставьте пустым для сохранения текущего)"
                      : "*"}
                  </label>
                  <input
                    type="password"
                    required={!editingManager}
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
                    {editingManager ? "Обновить" : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно взятия денег у менеджера */}
      {showTakeMoneyDialog && selectedManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  Взять деньги у менеджера {selectedManager.name}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowTakeMoneyDialog(false);
                    setSelectedManager(null);
                    setTakeMoneyForm({ amount: 0, description: "" });
                  }}
                  className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTakeMoney();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Сумма ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={takeMoneyForm.amount}
                    onChange={(e) =>
                      setTakeMoneyForm({
                        ...takeMoneyForm,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Описание
                  </label>
                  <textarea
                    value={takeMoneyForm.description}
                    onChange={(e) =>
                      setTakeMoneyForm({
                        ...takeMoneyForm,
                        description: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Причина взятия денег..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTakeMoneyDialog(false);
                      setSelectedManager(null);
                      setTakeMoneyForm({ amount: 0, description: "" });
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (takeMoneyForm.amount <= 0)}
                    className="btn btn-success flex-1"
                  >
                    Взять деньги
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
