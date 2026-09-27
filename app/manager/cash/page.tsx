"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { PageHeader, StatCard } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

interface Loan {
  id: number;
  amount: number;
  is_paid: boolean;
  created_at: string;
  order_id?: number;
  order_number?: string;
}

interface FinancialSummary {
  totalLoans: number;
  totalPaid: number;
  currentDebt: number;
}

export default function ManagerCashPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalLoans: 0,
    totalPaid: 0,
    currentDebt: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const response = await fetch("/api/manager/cash");
      if (response.ok) {
        const data = await response.json();
        setLoans(data.loans);
        setSummary(data.summary);
      } else {
        console.error("Ошибка загрузки финансовых данных");
      }
    } catch (error) {
      console.error("Ошибка загрузки финансовых данных:", error);
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
        title="Мои финансы"
        description="Долг за полученный от компании товар и его оплата"
        actions={
          <>
            <button
              onClick={() => router.push("/manager")}
              className="btn btn-secondary"
            >
              Назад
            </button>
            <button
              onClick={() => router.push("/manager/transfers")}
              className="btn btn-primary"
            >
              <Icon name="transfer" className="h-4 w-4" />
              Отправить деньги администратору
            </button>
          </>
        }
      />

      {/* Сводка */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Получено товара на сумму"
          value={formatMoney(summary.totalLoans)}
          icon="wallet"
          tone="neutral"
        />
        <StatCard
          label="Выплачено"
          value={formatMoney(summary.totalPaid)}
          icon="shield"
          tone="positive"
        />
        <StatCard
          label="Текущая задолженность"
          value={formatMoney(summary.currentDebt)}
          icon="clock"
          tone="negative"
        />
      </div>

      {/* Долги за товар */}
      <section className="card mt-6 overflow-hidden">
        <div className="card-header">
          <h2 className="text-base font-semibold text-ink-900">
            Долги за товар
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Товар, переданный вам администратором, по цене передачи. Долг гасится переводами
          </p>
        </div>
        {loans.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500">
            У вас пока нет долгов за товар
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Дата</th>
                  <th className="table-header text-right">Сумма</th>
                  <th className="table-header">Заказ</th>
                  <th className="table-header">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-ink-50">
                    <td className="table-cell text-ink-600">
                      {formatDate(loan.created_at)}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatMoney(loan.amount)}
                    </td>
                    <td className="table-cell text-ink-500">
                      {loan.order_number || "—"}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`status-badge ${
                          loan.is_paid ? "status-success" : "status-danger"
                        }`}
                      >
                        {loan.is_paid ? "Выплачен" : "Активен"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
