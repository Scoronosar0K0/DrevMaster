"use client";
import { useState, useEffect } from "react";

interface Partner {
  id: number;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferForm.amount || transferForm.amount <= 0) {
      alert("Укажите корректную сумму");
      return;
    }

    if (transferForm.to_user_type === "partner" && !transferForm.to_user_id) {
      alert("Выберите партнера");
      return;
    }

    try {
      const response = await fetch("/api/manager-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transferForm,
          to_user_id:
            transferForm.to_user_type === "admin"
              ? 1
              : parseInt(transferForm.to_user_id),
        }),
      });

      if (response.ok) {
        alert("Заявка на перевод отправлена!");
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
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка создания перевода:", error);
      alert("Ошибка создания перевода");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                💸 Переводы
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Отправка переводов администратору и партнерам
              </p>
            </div>
            <button
              onClick={() => setShowTransferForm(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl mt-4 sm:mt-0"
            >
              ➕ Новый перевод
            </button>
          </div>
        </div>

        {/* Список переводов */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              История переводов
            </h2>

            {transfers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl sm:text-8xl mb-4">💸</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Переводов пока нет
                </h3>
                <p className="text-gray-500 mb-6">
                  Создайте первый перевод для начала работы
                </p>
                <button
                  onClick={() => setShowTransferForm(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Создать перевод
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-3 sm:mb-0">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                          Получатель: {transfer.to_user_name}
                        </h3>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                          ${transfer.amount.toLocaleString()}
                        </p>
                        {transfer.description && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {transfer.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(transfer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            transfer.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : transfer.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Модальное окно формы */}
        {showTransferForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Новый перевод
                  </h3>
                  <button
                    onClick={() => setShowTransferForm(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Получатель *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
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
                          className="mr-2"
                        />
                        Администратор
                      </label>
                      <label className="flex items-center">
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
                          className="mr-2"
                        />
                        Партнер
                      </label>
                    </div>
                  </div>

                  {transferForm.to_user_type === "partner" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Выберите партнера</option>
                        {partners.map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name} (@{partner.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Цель перевода..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTransferForm(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Отправить
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
