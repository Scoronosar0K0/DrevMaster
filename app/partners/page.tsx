"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { notify, confirmAction } from "@/components/feedback";

const SEARCH_PATH = "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z";
const EDIT_PATH =
  "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const TRASH_PATH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

interface Partner {
  id: number;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  description?: string;
  created_at: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    description: "",
    password: "",
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
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch("/api/partners");
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error("Ошибка загрузки партнеров:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPartner
        ? `/api/partners/${editingPartner.id}`
        : "/api/partners";

      const method = editingPartner ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchPartners();
        resetForm();
        notify.success(editingPartner ? "Партнер обновлен" : "Партнер создан");
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
      name: "",
      username: "",
      email: "",
      phone: "",
      description: "",
      password: "",
    });
    setShowAddForm(false);
    setEditingPartner(null);
  };

  const handleEdit = (partner: Partner) => {
    setFormData({
      name: partner.name,
      username: partner.username,
      email: partner.email || "",
      phone: partner.phone || "",
      description: partner.description || "",
      password: "",
    });
    setEditingPartner(partner);
    setShowAddForm(true);
  };

  const handleDelete = guard(async (id: number) => {
    if (!await confirmAction("Вы уверены, что хотите удалить партнера?", { danger: true })) return;

    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPartners();
        notify.success("Партнер удален");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при удалении");
    }
  });

  const filteredPartners = partners.filter(
    (partner) =>
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (partner.email &&
        partner.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-center py-24 text-ink-500">
          <span className="loading-spinner mr-3 text-brand-600" />
          <span className="text-sm">Загрузка партнеров...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Партнеры"
        description="Управление деловыми партнерами"
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Icon name="plus" className="h-4 w-4" />
            Добавить партнера
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
          placeholder="Поиск партнеров..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Список партнеров */}
      {filteredPartners.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
            <Icon name="users" className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-ink-900">
            {searchTerm ? "Партнеры не найдены" : "Нет партнеров"}
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {searchTerm
              ? "Попробуйте изменить поисковый запрос"
              : "Добавьте первого партнера для начала работы"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary mt-6"
            >
              <Icon name="plus" className="h-4 w-4" />
              Добавить первого партнера
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-ink-100 bg-ink-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-500 md:grid">
            <div className="col-span-4">Партнер</div>
            <div className="col-span-4">Контакты</div>
            <div className="col-span-2">Добавлен</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>
          <ul className="divide-y divide-ink-100">
            {filteredPartners.map((partner) => (
              <li
                key={partner.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-ink-50 md:grid-cols-12 md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3 md:col-span-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
                    {partner.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-900">
                      {partner.name}
                    </div>
                    <div className="truncate text-xs text-ink-500">
                      @{partner.username}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5 text-sm text-ink-500 md:col-span-4">
                  {partner.email && (
                    <div className="truncate">{partner.email}</div>
                  )}
                  {partner.phone && (
                    <div className="truncate">{partner.phone}</div>
                  )}
                  {!partner.email && !partner.phone && (
                    <div className="text-ink-400">—</div>
                  )}
                  {partner.description && (
                    <div className="line-clamp-1 text-xs text-ink-400">
                      {partner.description}
                    </div>
                  )}
                </div>

                <div className="text-sm text-ink-500 md:col-span-2">
                  {formatDate(partner.created_at)}
                </div>

                <div className="flex items-center gap-1 md:col-span-2 md:justify-end">
                  <button
                    onClick={() => setSelectedPartner(partner)}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    title="Подробности"
                  >
                    <Icon name="eye" className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(partner)}
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
                    disabled={submitting}
                    onClick={() => handleDelete(partner.id)}
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

      {/* Модальное окно формы */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  {editingPartner
                    ? "Редактировать партнера"
                    : "Добавить партнера"}
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
                    placeholder="Имя партнера"
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
                    placeholder="Логин"
                  />
                </div>

                {!editingPartner && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-700">
                      Пароль *
                    </label>
                    <input
                      type="password"
                      required={!editingPartner}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="input-field"
                      placeholder="Пароль"
                    />
                  </div>
                )}

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

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Дополнительная информация..."
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
                    {editingPartner ? "Обновить" : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  Информация о партнере
                </h3>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xl font-semibold text-ink-700">
                  {selectedPartner.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-base font-semibold text-ink-900">
                    {selectedPartner.name}
                  </h4>
                  <p className="text-sm text-ink-500">
                    @{selectedPartner.username}
                  </p>
                </div>
              </div>

              <dl className="divide-y divide-ink-100 rounded-lg border border-ink-200 text-sm">
                {selectedPartner.email && (
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-ink-500">Email</dt>
                    <dd className="truncate text-ink-900">
                      {selectedPartner.email}
                    </dd>
                  </div>
                )}

                {selectedPartner.phone && (
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-ink-500">Телефон</dt>
                    <dd className="text-ink-900">{selectedPartner.phone}</dd>
                  </div>
                )}

                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-500">Создан</dt>
                  <dd className="text-ink-900">
                    {formatDate(selectedPartner.created_at)}
                  </dd>
                </div>
              </dl>

              {selectedPartner.description && (
                <div className="mt-4">
                  <h5 className="mb-1 text-sm font-medium text-ink-700">
                    Описание
                  </h5>
                  <p className="text-sm text-ink-600">
                    {selectedPartner.description}
                  </p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPartner(null);
                    handleEdit(selectedPartner);
                  }}
                  className="btn btn-primary flex-1"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="btn btn-secondary flex-1"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
