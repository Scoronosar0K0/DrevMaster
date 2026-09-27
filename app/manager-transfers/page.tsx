"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { notify } from "@/components/feedback";

interface Partner {
  id: number;
  user_id: number;
  name: string;
  username: string;
}

interface Transfer {
  id: number;
  to_user_id: number;
  to_user_name: string;
  amount: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function ManagerTransfersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferForm, setShowTransferForm] = useState(false);

  const [transferForm, setTransferForm] = useState({
    to_user_type: "admin", // 'admin' или 'partner'
    to_user_id: "",
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([fetchPartners(), fetchTransfers()]);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await fetch("/api/partners");
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error("Ошибка загрузки партнеров:", error);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await fetch("/api/manager-transfers");
      const data = await response.json();
      setTransfers(data);
    } catch (error) {
      console.error("Ошибка загрузки переводов:", error);
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferForm.amount || transferForm.amount <= 0) {
      notify.error("Укажите корректную сумму");
      return;
    }

    if (transferForm.to_user_type === "partner" && !transferForm.to_user_id) {
      notify.error("Выберите партнера");
      return;
    }

    try {
      const response = await fetch("/api/manager-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transferForm,
          // Для перевода в компанию администратора выбирает сервер
          to_user_id:
            transferForm.to_user_type === "admin"
              ? undefined
              : parseInt(transferForm.to_user_id),
        }),
      });

      if (response.ok) {
        notify.success("Заявка на перевод отправлена!");
        setTransferForm({
          to_user_type: "admin",
          to_user_id: "",
          amount: 0,
          description: "",
        });
        setShowTransferForm(false);
        fetchTransfers();
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка создания перевода:", error);
      notify.error("Ошибка создания перевода");
    }
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-center py-24 text-ink-500">
          <span className="loading-spinner mr-3 text-brand-600" />
          <span className="text-sm">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Переводы"
        description="Отправка переводов администратору и партнерам"
        actions={
          <button
            onClick={() => setShowTransferForm(true)}
            className="btn btn-primary"
          >
            <Icon name="plus" className="h-4 w-4" />
            Новый перевод
          </button>
        }
      />

      {/* Список переводов */}
      <section className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-base font-semibold text-ink-900">
            История переводов
          </h2>
        </div>

        {transfers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-lg bg-ink-100 p-3 text-ink-600">
              <Icon name="transfer" className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-ink-900">
              Переводов пока нет
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              Создайте первый перевод для начала работы
            </p>
            <button
              onClick={() => setShowTransferForm(true)}
              className="btn btn-primary mt-6"
            >
              Создать перевод
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {transfers.map((transfer) => (
              <li
                key={transfer.id}
                className="px-6 py-4 transition-colors hover:bg-ink-50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-3 min-w-0 sm:mb-0">
                    <h3 className="text-sm font-medium text-ink-900">
                      Получатель: {transfer.to_user_name}
                    </h3>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-ink-900">
                      {formatMoney(transfer.amount)}
                    </p>
                    {transfer.description && (
                      <p className="mt-1 text-sm text-ink-500">
                        {transfer.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-400">
                      {formatDate(transfer.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`status-badge ${
                        transfer.status === "pending"
                          ? "status-warning"
                          : transfer.status === "approved"
                          ? "status-success"
                          : "status-danger"
                      }`}
                    >
                      {transfer.status === "pending"
                        ? "На рассмотрении"
                        : transfer.status === "approved"
                        ? "Одобрено"
                        : "Отклонено"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Модальное окно формы */}
      {showTransferForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  Новый перевод
                </h3>
                <button
                  onClick={() => setShowTransferForm(false)}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">
                    Получатель *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm text-ink-800">
                      <input
                        type="radio"
                        name="recipient"
                        value="admin"
                        checked={transferForm.to_user_type === "admin"}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            to_user_type: e.target.value,
                            to_user_id: "",
                          })
                        }
                        className="mr-2 accent-brand-600"
                      />
                      Администратор
                    </label>
                    <label className="flex items-center text-sm text-ink-800">
                      <input
                        type="radio"
                        name="recipient"
                        value="partner"
                        checked={transferForm.to_user_type === "partner"}
                        onChange={(e) =>
                          setTransferForm({
                            ...transferForm,
                            to_user_type: e.target.value,
                            to_user_id: "",
                          })
                        }
                        className="mr-2 accent-brand-600"
                      />
                      Партнер
                    </label>
                  </div>
                </div>

                {transferForm.to_user_type === "partner" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">
                      Выберите партнера *
                    </label>
                    <select
                      required
                      value={transferForm.to_user_id}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          to_user_id: e.target.value,
                        })
                      }
                      className="input-field"
                    >
                      <option value="">Выберите партнера</option>
                      {partners.map((partner) => (
                        // Перевод адресуется пользователю, а не записи партнера
                        <option key={partner.id} value={partner.user_id}>
                          {partner.name} (@{partner.username})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-ink-500">
                      Вы платите партнеру от имени компании. После подтверждения
                      администратором сумма уменьшит ваш долг и долг компании
                      перед этим партнером
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">
                    Сумма ($) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={transferForm.amount || ""}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink-700">
                    Описание
                  </label>
                  <textarea
                    value={transferForm.description}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        description: e.target.value,
                      })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Цель перевода..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button disabled={submitting} type="submit" className="btn btn-primary flex-1">
                    Отправить
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
