"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

interface Partner {
  id: number;
  name: string;
}

interface Loan {
  id: number;
  partner_id: number;
  partner_name: string;
  amount: number;
  order_id?: number;
  order_number?: string;
  is_paid: boolean;
  created_at: string;
  loan_date?: string;
  description?: string;
  // 'manager' — менеджер должен нам за товар; иначе займ, который мы возвращаем
  partner_role?: string;
}

const isManagerDebt = (loan: Loan) => loan.partner_role === "manager";

export default function CashPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPartialPaymentDialog, setShowPartialPaymentDialog] =
    useState(false);
  const [showLoanDetailsDialog, setShowLoanDetailsDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [partialPaymentForm, setPartialPaymentForm] = useState({
    amount: 0,
  });

  const [loanForm, setLoanForm] = useState({
    partner_id: "",
    amount: 0,
    description: "",
    loan_date: new Date().toISOString().split("T")[0],
  });

  const [incomeForm, setIncomeForm] = useState({
    amount: 0,
    description: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    description: "",
    link_to_order: false,
    order_id: "",
  });

  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchPartners(),
        fetchLoans(),
        fetchOrders(),
        fetchTotalBalance(),
      ]);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    const response = await fetch("/api/partners");
    const data = await response.json();
    setPartners(data);
  };

  const fetchLoans = async () => {
    const response = await fetch("/api/loans");
    const data = await response.json();
    setLoans(data);
  };

  const fetchOrders = async () => {
    const response = await fetch("/api/orders");
    const data = await response.json();
    setOrders(data);
  };

  const fetchTotalBalance = async () => {
    const response = await fetch("/api/cash/balance");
    const data = await response.json();
    setTotalBalance(data.balance);
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loanForm.partner_id || loanForm.amount <= 0) {
      alert("Выберите партнера и укажите сумму");
      return;
    }

    try {
      // Определяем, является ли это займом от администратора
      const from_admin = loanForm.partner_id === "admin";
      
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...loanForm,
          from_admin,
          // Если от админа, то partner_id не нужен
          partner_id: from_admin ? undefined : loanForm.partner_id,
        }),
      });

      if (response.ok) {
        alert("Займ выдан успешно!");
        setLoanForm({
          partner_id: "",
          amount: 0,
          description: "",
          loan_date: new Date().toISOString().split("T")[0],
        });
        setShowLoanForm(false);
        fetchData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка при выдаче займа:", error);
      alert("Ошибка при выдаче займа");
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (incomeForm.amount <= 0) {
      alert("Укажите сумму поступления");
      return;
    }

    try {
      const response = await fetch("/api/cash/income", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(incomeForm),
      });

      if (response.ok) {
        alert("Поступление добавлено успешно!");
        setIncomeForm({ amount: 0, description: "" });
        setShowIncomeForm(false);
        fetchData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка при добавлении поступления:", error);
      alert("Ошибка при добавлении поступления");
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (expenseForm.amount <= 0) {
      alert("Укажите сумму расхода");
      return;
    }

    try {
      const response = await fetch("/api/cash/expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseForm),
      });

      if (response.ok) {
        alert("Расход добавлен успешно!");
        setExpenseForm({
          amount: 0,
          description: "",
          link_to_order: false,
          order_id: "",
        });
        setShowExpenseForm(false);
        fetchData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка при добавлении расхода:", error);
      alert("Ошибка при добавлении расхода");
    }
  };

  const payLoan = async (loanId: number, isPartial: boolean = false) => {
    if (isPartial) {
      // Открываем диалог для частичной оплаты
      const loan = loans.find((l) => l.id === loanId);
      if (loan) {
        setSelectedLoan(loan);
        setPartialPaymentForm({ amount: 0 });
        setShowPartialPaymentDialog(true);
      }
      return;
    }

    // Полная оплата
    if (!confirm("Подтвердить полную оплату займа?")) return;

    try {
      const response = await fetch(`/api/loans/${loanId}/repay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPartialPayment: false }),
      });

      if (response.ok) {
        alert("Займ погашен!");
        fetchData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка при погашении займа:", error);
      alert("Ошибка при погашении займа");
    }
  };

  const handlePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLoan || partialPaymentForm.amount <= 0) {
      alert("Укажите корректную сумму оплаты");
      return;
    }

    if (partialPaymentForm.amount > selectedLoan.amount) {
      alert("Сумма оплаты не может превышать размер займа");
      return;
    }

    try {
      const response = await fetch(`/api/loans/${selectedLoan.id}/repay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: partialPaymentForm.amount,
          isPartialPayment: true,
        }),
      });

      if (response.ok) {
        alert("Частичная оплата займа выполнена!");
        setShowPartialPaymentDialog(false);
        setSelectedLoan(null);
        fetchData();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка при частичной оплате займа:", error);
      alert("Ошибка при частичной оплате займа");
    }
  };

  const viewLoanDetails = async (loan: Loan) => {
    setSelectedLoan(loan);
    
    try {
      // Загружаем историю платежей по займу
      const response = await fetch(`/api/loans/${loan.id}/payments`);
      if (response.ok) {
        const payments = await response.json();
        setLoanPayments(payments);
      } else {
        setLoanPayments([]);
      }
    } catch (error) {
      console.error("Ошибка загрузки платежей:", error);
      setLoanPayments([]);
    }
    
    setShowLoanDetailsDialog(true);
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"></div>
          <p className="mt-3 text-sm text-ink-500">Загрузка данных кассы...</p>
        </div>
      </div>
    );
  }

  const activeLoans = loans.filter((loan) => !loan.is_paid);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <PageHeader title="Касса" description="Управление финансами компании" />

        {/* Баланс и быстрые действия */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="card bg-ink-950 p-5 text-white sm:col-span-3 lg:col-span-1">
            <div className="text-sm font-medium text-ink-300">Текущий баланс</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              {formatMoney(totalBalance)}
            </div>
            <div className="mt-1 text-xs text-ink-400">
              Займы + поступления − расходы
            </div>
          </div>

          <button
            onClick={() => setShowIncomeForm(true)}
            className="card flex items-center gap-3 p-5 text-left transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <div className="rounded-lg bg-ink-100 p-2 text-ink-600">
              <Icon name="trendUp" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">Поступление</div>
              <div className="text-xs text-ink-500">Добавить доход</div>
            </div>
          </button>

          <button
            onClick={() => setShowExpenseForm(true)}
            className="card flex items-center gap-3 p-5 text-left transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <div className="rounded-lg bg-ink-100 p-2 text-ink-600">
              <Icon name="wallet" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">Расход</div>
              <div className="text-xs text-ink-500">Записать трату</div>
            </div>
          </button>

          <button
            onClick={() => setShowLoanForm(true)}
            className="card flex items-center gap-3 p-5 text-left transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <div className="rounded-lg bg-ink-100 p-2 text-ink-600">
              <Icon name="users" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-900">Взять займ</div>
              <div className="text-xs text-ink-500">Взять у партнера</div>
            </div>
          </button>
        </div>

        {/* Займы */}
        <section className="card mt-6">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">
              Непогашенные займы
            </h2>
            <p className="text-xs text-ink-500">
              Займы, которые мы должны вернуть, и долги менеджеров за товар
            </p>
          </div>

          {activeLoans.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-ink-500">
              Активных займов нет
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {activeLoans.map((loan) => {
                const managerDebt = isManagerDebt(loan);
                return (
                  <li
                    key={loan.id}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink-50 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink-900">
                          {loan.partner_name}
                        </span>
                        <span
                          className={`status-badge ${
                            managerDebt ? "status-success" : "status-danger"
                          }`}
                        >
                          {managerDebt ? "Долг менеджера" : "Мы должны"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-ink-500">
                        {formatDate(loan.created_at)}
                        {loan.order_number && ` · Заказ #${loan.order_number}`}
                      </div>
                    </div>

                    <div
                      className={`text-lg font-semibold tracking-tight sm:w-40 sm:text-right ${
                        managerDebt ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatMoney(loan.amount)}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {/* Кнопка просмотра всегда доступна */}
                      <button
                        onClick={() => viewLoanDetails(loan)}
                        className="btn btn-secondary px-3 py-1.5 text-xs"
                      >
                        Просмотр
                      </button>

                      {/* Кнопки оплаты только для неоплаченных займов */}
                      {!loan.is_paid && (
                        <>
                          <button
                            onClick={() => payLoan(loan.id, true)}
                            className="btn border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-400"
                          >
                            Частично
                          </button>
                          <button
                            onClick={() => payLoan(loan.id, false)}
                            className="btn btn-success px-3 py-1.5 text-xs"
                          >
                            Полностью
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Модальные окна форм */}
      {/* Форма поступлений */}
      {showIncomeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  Добавить поступление
                </h3>
                <button
                  onClick={() => setShowIncomeForm(false)}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleIncomeSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Сумма *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={incomeForm.amount || ""}
                    onChange={(e) =>
                      setIncomeForm({
                        ...incomeForm,
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
                    value={incomeForm.description}
                    onChange={(e) =>
                      setIncomeForm({
                        ...incomeForm,
                        description: e.target.value,
                      })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Источник поступления..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIncomeForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-success flex-1">
                    Добавить
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Форма расходов */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  Добавить расход
                </h3>
                <button
                  onClick={() => setShowExpenseForm(false)}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Сумма *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={expenseForm.amount || ""}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
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
                    value={expenseForm.description}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        description: e.target.value,
                      })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Назначение расхода..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="link_to_order"
                      checked={expenseForm.link_to_order}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          link_to_order: e.target.checked,
                          order_id: e.target.checked
                            ? expenseForm.order_id
                            : "",
                        })
                      }
                      className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    <label
                      htmlFor="link_to_order"
                      className="ml-2 text-sm text-ink-700"
                    >
                      Связать с заказом
                    </label>
                  </div>

                  {expenseForm.link_to_order && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-ink-700">
                        Выберите заказ
                      </label>
                      <select
                        title="Выберите заказ для связи с расходом"
                        value={expenseForm.order_id}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            order_id: e.target.value,
                          })
                        }
                        className="input-field"
                      >
                        <option value="">Выберите заказ</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            #{order.order_number} - {order.supplier_name} (
                            {order.item_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-danger flex-1">
                    Добавить
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Форма займа */}
      {showLoanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">Взять займ</h3>
                <button
                  onClick={() => setShowLoanForm(false)}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleLoanSubmit} className="space-y-4">
                {/* Партнер */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Партнер *
                  </label>
                  <select
                    required
                    value={loanForm.partner_id}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, partner_id: e.target.value })
                    }
                    className="input-field"
                    title="Выберите партнера для займа"
                  >
                    <option value="">Выберите партнера</option>
                    {/* Опция для администратора */}
                    <option value="admin">Администратор</option>
                    {/* Обычные партнеры */}
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Дата получения займа */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Дата получения займа
                  </label>
                  <input
                    type="date"
                    value={loanForm.loan_date}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, loan_date: e.target.value })
                    }
                    className="input-field"
                    title="Выберите дату получения займа"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Сумма займа *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={loanForm.amount || ""}
                    onChange={(e) =>
                      setLoanForm({
                        ...loanForm,
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
                    value={loanForm.description}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, description: e.target.value })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Цель займа..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoanForm(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    Взять займ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Диалог просмотра деталей займа */}
      {showLoanDetailsDialog && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Детали займа</h2>
              <button
                onClick={() => setShowLoanDetailsDialog(false)}
                className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                aria-label="Закрыть"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Основная информация о займе */}
              <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-ink-900">
                  Информация о займе
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <span className="text-xs text-ink-500">Партнер:</span>
                    <p className="text-sm font-medium text-ink-900">
                      {selectedLoan.partner_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ink-500">Сумма:</span>
                    <p
                      className={`text-sm font-semibold ${
                        isManagerDebt(selectedLoan)
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatMoney(selectedLoan.amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ink-500">Дата займа:</span>
                    <p className="text-sm font-medium text-ink-900">
                      {selectedLoan.loan_date ?
                        formatDate(selectedLoan.loan_date) :
                        formatDate(selectedLoan.created_at)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-ink-500">Статус:</span>
                    <p className="mt-0.5">
                      <span
                        className={`status-badge ${
                          selectedLoan.is_paid ? "status-success" : "status-danger"
                        }`}
                      >
                        {selectedLoan.is_paid ? 'Оплачен' : 'Не оплачен'}
                      </span>
                    </p>
                  </div>
                  {selectedLoan.order_number && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-ink-500">Связанный заказ:</span>
                      <p className="text-sm font-medium text-ink-900">
                        #{selectedLoan.order_number}
                      </p>
                    </div>
                  )}
                  {selectedLoan.description && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-ink-500">Описание:</span>
                      <p className="text-sm font-medium text-ink-900">
                        {selectedLoan.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* История платежей */}
              {loanPayments.length > 0 && (
                <div className="rounded-lg border border-ink-100 bg-ink-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-ink-900">
                    История платежей
                  </h3>
                  <div className="divide-y divide-ink-200">
                    {loanPayments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-ink-900">
                            {formatMoney(payment.amount)}
                          </p>
                          <p className="text-xs text-ink-500">
                            {formatDate(payment.payment_date)}
                          </p>
                        </div>
                        <span className="status-badge status-success">Оплачено</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLoanDetailsDialog(false)}
                  className="btn btn-secondary flex-1"
                >
                  Закрыть
                </button>
                {!selectedLoan.is_paid && (
                  <button
                    onClick={() => {
                      setShowLoanDetailsDialog(false);
                      setShowPartialPaymentDialog(true);
                    }}
                    className="btn btn-primary flex-1"
                  >
                    Оплатить
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог частичной оплаты займа */}
      {showPartialPaymentDialog && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-ink-900">
              Частичная оплата займа
            </h2>
            <div className="mb-4 rounded-lg border border-ink-100 bg-ink-50 p-3">
              <p className="text-sm text-ink-500">
                Займ партнера: {selectedLoan.partner_name}
              </p>
              <p className="mt-1 text-base font-semibold text-ink-900">
                Общая сумма: {formatMoney(selectedLoan.amount)}
              </p>
            </div>
            <form onSubmit={handlePartialPayment}>
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Сумма к оплате *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedLoan.amount}
                  required
                  value={partialPaymentForm.amount || ""}
                  onChange={(e) =>
                    setPartialPaymentForm({
                      ...partialPaymentForm,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input-field w-full"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-ink-500">
                  Максимум: {formatMoney(selectedLoan.amount)}
                </p>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary flex-1">
                  Оплатить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialPaymentDialog(false);
                    setSelectedLoan(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
