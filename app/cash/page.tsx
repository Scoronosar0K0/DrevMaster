"use client";
import { useState, useEffect } from "react";

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
}

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
    from_admin: false,
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

    if (
      (!loanForm.from_admin && !loanForm.partner_id) ||
      loanForm.amount <= 0
    ) {
      alert("Выберите источник займа и укажите сумму");
      return;
    }

    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loanForm),
      });

      if (response.ok) {
        alert("Займ выдан успешно!");
        setLoanForm({
          partner_id: "",
          amount: 0,
          description: "",
          loan_date: new Date().toISOString().split("T")[0],
          from_admin: false,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных кассы...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            💰 Касса
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Управление финансами компании
          </p>
        </div>

        {/* Баланс */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 text-white">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-medium mb-2">
              Текущий баланс
            </h2>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              ${totalBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Быстрые действия */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <button
            onClick={() => setShowIncomeForm(true)}
            className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl p-4 sm:p-6 transition-all duration-200 transform hover:-translate-y-1 group"
          >
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto group-hover:scale-110 transition-transform">
                📈
              </div>
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">
                Поступление
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">Добавить доход</p>
            </div>
          </button>

          <button
            onClick={() => setShowExpenseForm(true)}
            className="bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl p-4 sm:p-6 transition-all duration-200 transform hover:-translate-y-1 group"
          >
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto group-hover:scale-110 transition-transform">
                📉
              </div>
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">
                Расход
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">Записать трату</p>
            </div>
          </button>

          <button
            onClick={() => setShowLoanForm(true)}
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-4 sm:p-6 transition-all duration-200 transform hover:-translate-y-1 group"
          >
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto group-hover:scale-110 transition-transform">
                🤝
              </div>
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">
                Взять займ
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Взять у партнера
              </p>
            </div>
          </button>
        </div>

        {/* Займы */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
            Займы партнеров (должны вам)
          </h2>

          {loans.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-6xl sm:text-8xl mb-4">🏦</div>
              <p className="text-sm sm:text-base text-gray-500">
                Активных займов нет
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {loans
                .filter((loan) => !loan.is_paid)
                .map((loan) => (
                  <div
                    key={loan.id}
                    className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-3 sm:mb-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                          {loan.partner_name}
                        </h3>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                          ${loan.amount.toLocaleString()}
                        </p>
                        {loan.order_number && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Заказ: #{loan.order_number}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(loan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Кнопка просмотра всегда доступна */}
                        <button
                          onClick={() => viewLoanDetails(loan)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Просмотр
                        </button>
                        
                        {/* Кнопки оплаты только для неоплаченных займов */}
                        {!loan.is_paid && (
                          <>
                            <button
                              onClick={() => payLoan(loan.id, true)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                              Частично
                            </button>
                            <button
                              onClick={() => payLoan(loan.id, false)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                              Полностью
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальные окна форм */}
      {/* Форма поступлений */}
      {showIncomeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Добавить поступление
                </h3>
                <button
                  onClick={() => setShowIncomeForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleIncomeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Источник поступления..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowIncomeForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Добавить расход
                </h3>
                <button
                  onClick={() => setShowExpenseForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="link_to_order"
                      className="ml-2 text-sm text-gray-900"
                    >
                      Связать с заказом
                    </label>
                  </div>

                  {expenseForm.link_to_order && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Взять займ</h3>
                <button
                  onClick={() => setShowLoanForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleLoanSubmit} className="space-y-4">
                {/* Чекбокс "От администратора" */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="from_admin"
                    checked={loanForm.from_admin}
                    onChange={(e) =>
                      setLoanForm({
                        ...loanForm,
                        from_admin: e.target.checked,
                        partner_id: e.target.checked ? "" : loanForm.partner_id,
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label
                    htmlFor="from_admin"
                    className="text-sm font-medium text-gray-700"
                  >
                    Займ от администратора
                  </label>
                </div>

                {/* Партнер (показываем только если НЕ от админа) */}
                {!loanForm.from_admin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Партнер *
                    </label>
                    <select
                      required={!loanForm.from_admin}
                      value={loanForm.partner_id}
                      onChange={(e) =>
                        setLoanForm({ ...loanForm, partner_id: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      title="Выберите партнера для займа"
                    >
                      <option value="">Выберите партнера</option>
                      {partners.map((partner) => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Дата получения займа */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата получения займа
                  </label>
                  <input
                    type="date"
                    value={loanForm.loan_date}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, loan_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Выберите дату получения займа"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={loanForm.description}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, description: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Цель займа..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLoanForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Детали займа</h2>
              <button
                onClick={() => setShowLoanDetailsDialog(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Основная информация о займе */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Информация о займе</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-gray-600">Партнер:</span>
                    <p className="font-medium">{selectedLoan.partner_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Сумма:</span>
                    <p className="font-medium text-red-600">${selectedLoan.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Дата займа:</span>
                    <p className="font-medium">
                      {selectedLoan.loan_date ? 
                        new Date(selectedLoan.loan_date).toLocaleDateString("ru-RU") : 
                        new Date(selectedLoan.created_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Статус:</span>
                    <p className={`font-medium ${selectedLoan.is_paid ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedLoan.is_paid ? 'Оплачен' : 'Не оплачен'}
                    </p>
                  </div>
                  {selectedLoan.order_number && (
                    <div className="md:col-span-2">
                      <span className="text-sm text-gray-600">Связанный заказ:</span>
                      <p className="font-medium">#{selectedLoan.order_number}</p>
                    </div>
                  )}
                  {selectedLoan.description && (
                    <div className="md:col-span-2">
                      <span className="text-sm text-gray-600">Описание:</span>
                      <p className="font-medium">{selectedLoan.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* История платежей */}
              {loanPayments.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">История платежей</h3>
                  <div className="space-y-2">
                    {loanPayments.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          <p className="font-medium">${payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                        <span className="text-sm text-green-600">Оплачено</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowLoanDetailsDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Закрыть
                </button>
                {!selectedLoan.is_paid && (
                  <button
                    onClick={() => {
                      setShowLoanDetailsDialog(false);
                      setShowPartialPaymentDialog(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Частичная оплата займа</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Займ партнера: {selectedLoan.partner_name}
              </p>
              <p className="text-lg font-semibold">
                Общая сумма: ${selectedLoan.amount.toLocaleString()}
              </p>
            </div>
            <form onSubmit={handlePartialPayment}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <p className="text-xs text-gray-500 mt-1">
                  Максимум: ${selectedLoan.amount.toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Оплатить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartialPaymentDialog(false);
                    setSelectedLoan(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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
