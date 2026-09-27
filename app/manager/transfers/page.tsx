"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { notify } from "@/components/feedback";

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
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferForm, setTransferForm] = useState({
    amount: 0,
    description: "",
  });
  const router = useRouter();

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
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await fetch("/api/manager/transfers");
      if (response.ok) {
        const data = await response.json();
        setTransfers(data);
      } else {
        console.error("Ошибка загрузки переводов");
      }
    } catch (error) {
      console.error("Ошибка загрузки переводов:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferForm.amount || transferForm.amount <= 0) {
      notify.error("Укажите корректную сумму");
      return;
    }

    try {
      const response = await fetch("/api/manager/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: 1, // ID администратора
          amount: transferForm.amount,
          description: transferForm.description,
        }),
      });

      if (response.ok) {
        notify.success("Заявка на перевод отправлена!");
        setTransferForm({
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
          <span className="text-sm">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Переводы"
        description="Отправка денег администратору"
        actions={
          <>
            <button
              onClick={() => router.push("/manager")}
              className="btn btn-secondary"
            >
              Назад
            </button>
            <button
              onClick={() => setShowTransferForm(true)}
              className="btn btn-primary"
            >
              <Icon name="plus" className="h-4 w-4" />
              Отправить деньги
            </button>
          </>
        }
      />

      {/* История переводов */}
      <section className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-base font-semibold text-ink-900">
            История переводов
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Все ваши заявки на переводы администратору
          </p>
        </div>
        {transfers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500">
            У вас пока нет переводов
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Получатель</th>
                  <th className="table-header text-right">Сумма</th>
                  <th className="table-header">Описание</th>
                  <th className="table-header">Дата</th>
                  <th className="table-header">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-ink-50">
                    <td className="table-cell">{transfer.to_user_name}</td>
                    <td className="table-cell text-right font-medium">
                      {formatMoney(transfer.amount)}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-sm text-ink-500">
                      {transfer.description || "—"}
                    </td>
                    <td className="table-cell text-ink-500">
                      {formatDate(transfer.created_at)}
                    </td>
                    <td className="table-cell">
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
                          ? "Ожидает"
                          : transfer.status === "approved"
                          ? "Одобрен"
                          : "Отклонен"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Диалог создания перевода */}
      {showTransferForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  Отправить деньги администратору
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-ink-500">
                  После подтверждения администратором сумма поступит в кассу и
                  уменьшит ваш долг за товар
                </p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Сумма ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={transferForm.amount}
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
                  <label className="mb-1 block text-sm font-medium text-ink-700">
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
                    rows={3}
                    className="input-field"
                    placeholder="Причина перевода (необязательно)"
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button disabled={submitting} type="submit" className="btn btn-primary flex-1">
                    Отправить заявку
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransferForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
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
