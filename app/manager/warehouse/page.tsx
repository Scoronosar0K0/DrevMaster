"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate, formatMoney, todayLocal } from "@/lib/format";
import { notify } from "@/components/feedback";

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
    date: todayLocal(),
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

  const handleSellItem = guard(async () => {
    if (!selectedItem) return;

    if (sellForm.value <= 0 || sellForm.value > selectedItem.remaining_value) {
      notify.error(
        `Укажите корректное количество (доступно: ${selectedItem.remaining_value} ${selectedItem.measurement})`
      );
      return;
    }

    if (sellForm.price <= 0) {
      notify.error("Укажите корректную цену");
      return;
    }

    if (!sellForm.buyer_name.trim()) {
      notify.error("Укажите имя покупателя");
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
        notify.success("Товар успешно продан!");
        setShowSellDialog(false);
        setSelectedItem(null);
        setSellForm({
          value: 0,
          price: 0,
          buyer_name: "",
          description: "",
          date: todayLocal(),
        });
        fetchWarehouseItems();
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка продажи товара:", error);
      notify.error("Ошибка продажи товара");
    }
  });

  const openSellDialog = (item: WarehouseItem) => {
    setSelectedItem(item);
    setSellForm({
      value: item.remaining_value,
      price: 0,
      buyer_name: "",
      description: "",
      date: todayLocal(),
    });
    setShowSellDialog(true);
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

  const closeSellDialog = () => {
    setShowSellDialog(false);
    setSelectedItem(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Мой склад"
        description="Товары, приобретенные у администратора для перепродажи"
        actions={
          <button
            onClick={() => router.push("/manager")}
            className="btn btn-secondary"
          >
            Назад
          </button>
        }
      />

      {items.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-lg bg-ink-100 p-3 text-ink-600">
            <Icon name="archive" className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-ink-900">Склад пуст</h3>
          <p className="mt-1 text-sm text-ink-500">
            Здесь будут отображаться товары, которые вы приобрели у
            администратора
          </p>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-base font-semibold text-ink-900">
              Товары на складе
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Список товаров, доступных для продажи
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Товар</th>
                  <th className="table-header">Поставщик</th>
                  <th className="table-header text-right">Приобретено</th>
                  <th className="table-header text-right">Доступно</th>
                  <th className="table-header text-right">Сумма покупки</th>
                  <th className="table-header">Дата</th>
                  <th className="table-header">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-ink-900">
                        {item.item_name}
                      </div>
                      <div className="text-xs text-ink-500">
                        {item.order_number}
                      </div>
                    </td>
                    <td className="table-cell">{item.supplier_name}</td>
                    <td className="table-cell text-right">
                      {item.sale_value} {item.measurement}
                    </td>
                    <td className="table-cell text-right">
                      {item.remaining_value} {item.measurement}
                    </td>
                    <td className="table-cell text-right font-medium">
                      {formatMoney(item.sale_price)}
                    </td>
                    <td className="table-cell text-ink-500">
                      {formatDate(item.sale_date)}
                    </td>
                    <td className="table-cell">
                      {item.remaining_value > 0 ? (
                        <button
                          onClick={() => openSellDialog(item)}
                          className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
                        >
                          Продать
                        </button>
                      ) : (
                        <span className="status-badge bg-ink-100 text-ink-500">
                          Продано
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Диалог продажи */}
      {showSellDialog && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  Продажа товара
                </h3>
                <button
                  type="button"
                  onClick={closeSellDialog}
                  className="rounded-lg p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                <div className="font-medium text-ink-900">
                  {selectedItem.item_name}
                </div>
                Доступно: {selectedItem.remaining_value}{" "}
                {selectedItem.measurement}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
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
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Сумма продажи, итого ($) *
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
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
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
                    className="input-field"
                    placeholder="Имя покупателя"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
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
                    className="input-field"
                    placeholder="Дополнительная информация"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
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
                    className="input-field"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  disabled={submitting}
                  onClick={handleSellItem}
                  className="btn btn-primary flex-1"
                >
                  Продать
                </button>
                <button
                  onClick={closeSellDialog}
                  className="btn btn-secondary flex-1"
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
