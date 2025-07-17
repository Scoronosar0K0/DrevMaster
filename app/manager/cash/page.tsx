"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Заголовок */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => router.push("/manager")}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Назад к панели
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Мои финансы</h1>
              <p className="text-gray-600">
                Информация о займах и задолженности
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Сводка */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Общая сумма займов
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${summary.totalLoans.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Выплачено
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${summary.totalPaid.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">!</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Текущая задолженность
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${summary.currentDebt.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка перевода денег */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/manager/transfers")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Отправить деньги администратору
          </button>
        </div>

        {/* История займов */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              История займов
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Список всех ваших займов и их статус
            </p>
          </div>
          <div className="bg-white">
            {loans.length === 0 ? (
              <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
                У вас пока нет займов
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Сумма
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Заказ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loans.map((loan) => (
                      <tr key={loan.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(loan.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${loan.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {loan.order_number || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              loan.is_paid
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
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
          </div>
        </div>
      </div>
    </div>
  );
}
