"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WarehouseItem {
  id: number;
  order_id: number;
  order_number: string;
  supplier_name: string;
  item_name: string;
  sale_value: number;
  sale_price: number;
  remaining_value: number;
  measurement: string;
  description?: string;
  sale_date: string;
  status: string;
}

export default function ManagerWarehousePage() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<WarehouseItem | null>(null);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellForm, setSellForm] = useState({
    value: 0,
    price: 0,
    buyer_name: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const router = useRouter();

  useEffect(() => {
    fetchWarehouseItems();
  }, []);

  const fetchWarehouseItems = async () => {
    try {
      const response = await fetch("/api/manager/warehouse");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        console.error("Ошибка загрузки товаров склада");
      }
    } catch (error) {
      console.error("Ошибка загрузки товаров склада:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSellItem = async () => {
    if (!selectedItem) return;

    if (sellForm.value <= 0 || sellForm.value > selectedItem.remaining_value) {
      alert(
        `Укажите корректное количество (доступно: ${selectedItem.remaining_value} ${selectedItem.measurement})`
      );
      return;
    }

    if (sellForm.price <= 0) {
      alert("Укажите корректную цену");
      return;
    }

    if (!sellForm.buyer_name.trim()) {
      alert("Укажите имя покупателя");
      return;
    }

    try {
      const response = await fetch("/api/manager/warehouse/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selectedItem.id,
          value: sellForm.value,
          price: sellForm.price,
          buyer_name: sellForm.buyer_name,
          description: sellForm.description,
          date: sellForm.date,
        }),
      });

      if (response.ok) {
        alert("Товар успешно продан!");
        setShowSellDialog(false);
        setSelectedItem(null);
        setSellForm({
          value: 0,
          price: 0,
          buyer_name: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
        });
        fetchWarehouseItems();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка продажи товара:", error);
      alert("Ошибка продажи товара");
    }
  };

  const openSellDialog = (item: WarehouseItem) => {
    setSelectedItem(item);
    setSellForm({
      value: item.remaining_value,
      price: 0,
      buyer_name: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowSellDialog(true);
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
              <h1 className="text-3xl font-bold text-gray-900">Мой склад</h1>
              <p className="text-gray-600">
                Товары, приобретенные у администратора для перепродажи
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Склад пуст
            </h3>
            <p className="text-gray-500">
              Здесь будут отображаться товары, которые вы приобрели у
              администратора
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Товары на складе
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Список товаров, доступных для продажи
              </p>
            </div>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Товар
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Поставщик
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Приобретено
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Доступно
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Цена покупки
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.item_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.supplier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.sale_value} {item.measurement}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.remaining_value} {item.measurement}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.sale_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.sale_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.remaining_value > 0 ? (
                          <button
                            onClick={() => openSellDialog(item)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            Продать
                          </button>
                        ) : (
                          <span className="text-gray-400">Продано</span>
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

      {/* Диалог продажи */}
      {showSellDialog && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Продажа товара</h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedItem.item_name}
                <br />
                Доступно: {selectedItem.remaining_value}{" "}
                {selectedItem.measurement}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Количество ({selectedItem.measurement}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={selectedItem.remaining_value}
                    value={sellForm.value}
                    onChange={(e) =>
                      setSellForm({
                        ...sellForm,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена продажи ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={sellForm.price}
                    onChange={(e) =>
                      setSellForm({
                        ...sellForm,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Покупатель *
                  </label>
                  <input
                    type="text"
                    required
                    value={sellForm.buyer_name}
                    onChange={(e) =>
                      setSellForm({
                        ...sellForm,
                        buyer_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Имя покупателя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <input
                    type="text"
                    value={sellForm.description}
                    onChange={(e) =>
                      setSellForm({
                        ...sellForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Дополнительная информация"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата продажи *
                  </label>
                  <input
                    type="date"
                    required
                    value={sellForm.date}
                    onChange={(e) =>
                      setSellForm({
                        ...sellForm,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSellItem}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
                >
                  Продать
                </button>
                <button
                  onClick={() => {
                    setShowSellDialog(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition duration-200"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
