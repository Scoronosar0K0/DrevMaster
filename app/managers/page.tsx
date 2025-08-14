"use client";
import { useState, useEffect } from "react";

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

  const handleTransferAction = async (
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
        alert(status === "approved" ? "Перевод одобрен!" : "Перевод отклонен!");
        fetchTransfers(); // Обновляем список
      } else {
        alert("Ошибка при обработке перевода");
      }
    } catch (error) {
      console.error("Ошибка при обработке перевода:", error);
      alert("Ошибка при обработке перевода");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        alert(editingManager ? "Менеджер обновлен" : "Менеджер создан");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при сохранении");
    }
  };

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

  const handleDelete = async (id: number) => {
    if (!confirm("Вы уверены, что хотите удалить менеджера?")) return;

    try {
      const response = await fetch(`/api/managers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchManagers();
        alert("Менеджер удален");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при удалении");
    }
  };

  const toggleActive = async (manager: Manager) => {
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
        alert(error.error || "Ошибка при обновлении статуса");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при обновлении статуса");
    }
  };

  const handleTakeMoney = async () => {
    if (!selectedManager || takeMoneyForm.amount <= 0) {
      alert("Выберите менеджера и укажите сумму");
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
        alert("Деньги успешно взяты у менеджера");
        setShowTakeMoneyDialog(false);
        setSelectedManager(null);
        setTakeMoneyForm({ amount: 0, description: "" });
        fetchManagers();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка взятия денег:", error);
      alert("Ошибка взятия денег");
    }
  };

  const filteredManagers = managers.filter(
    (manager) =>
      manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (manager.email &&
        manager.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка менеджеров...</p>
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
                👥 Менеджеры
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Управление менеджерами компании
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl mt-4 sm:mt-0"
            >
              ➕ Добавить менеджера
            </button>
          </div>

          {/* Поиск */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск менеджеров..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Список менеджеров */}
        {filteredManagers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl sm:text-8xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "Менеджеры не найдены" : "Нет менеджеров"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? "Попробуйте изменить поисковый запрос"
                : "Добавьте первого менеджера для начала работы"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Добавить первого менеджера
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManagers.map((manager, index) => (
              <div
                key={manager.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "slideInUp 0.6s ease-out forwards",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                      {manager.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {manager.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        @{manager.username}
                      </p>
                      <div className="flex items-center mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            manager.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {manager.is_active ? "Активен" : "Неактивен"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => toggleActive(manager)}
                      className={`p-2 rounded-lg transition-colors ${
                        manager.is_active
                          ? "text-red-600 hover:text-red-800 hover:bg-red-50"
                          : "text-green-600 hover:text-green-800 hover:bg-green-50"
                      }`}
                      title={
                        manager.is_active ? "Деактивировать" : "Активировать"
                      }
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {manager.is_active ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12M6 6l6 6"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(manager)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedManager(manager);
                        setTakeMoneyForm({ amount: 0, description: "" });
                        setShowTakeMoneyDialog(true);
                      }}
                      className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                      title="Взять деньги"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(manager.id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {manager.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      {manager.email}
                    </div>
                  )}
                  {manager.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      {manager.phone}
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                    <span className={`font-semibold ${
                      manager.debt > 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      Долг: ${manager.debt.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h-8zM3 9a1 1 0 011-1h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"
                      />
                    </svg>
                    {new Date(manager.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Секция запросов на переводы */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                💸 Запросы на переводы
              </h2>
              <p className="text-gray-600">
                Заявки от менеджеров на перевод средств
              </p>
            </div>
          </div>

          {transfersLoading ? (
            <div className="text-center py-8">
              <div className="text-lg">Загрузка переводов...</div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Нет запросов на переводы
              </h3>
              <p className="text-gray-500">
                Все заявки менеджеров на переводы будут отображаться здесь
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Менеджер
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Получатель
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Сумма
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Описание
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {transfer.from_manager_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{transfer.from_manager_username}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.to_user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${transfer.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {transfer.description || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transfer.created_at).toLocaleDateString(
                            "ru-RU"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transfer.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : transfer.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {transfer.status === "pending"
                              ? "Ожидает"
                              : transfer.status === "approved"
                              ? "Одобрен"
                              : "Отклонен"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {transfer.status === "pending" ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() =>
                                  handleTransferAction(transfer.id, "approved")
                                }
                                className="text-green-600 hover:text-green-900 transition-colors"
                              >
                                ✓ Одобрить
                              </button>
                              <button
                                onClick={() =>
                                  handleTransferAction(transfer.id, "rejected")
                                }
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                ✗ Отклонить
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">
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
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно формы менеджера */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingManager
                    ? "Редактировать менеджера"
                    : "Добавить менеджера"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Полное имя менеджера"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя пользователя *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Пароль"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">
                Взять деньги у менеджера {selectedManager.name}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTakeMoney();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Причина взятия денег..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTakeMoneyDialog(false);
                      setSelectedManager(null);
                      setTakeMoneyForm({ amount: 0, description: "" });
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={takeMoneyForm.amount <= 0}
                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
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
