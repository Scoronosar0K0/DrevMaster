"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { notify, confirmAction } from "@/components/feedback";

const SEARCH_PATH = "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z";
const EDIT_PATH =
  "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const TRASH_PATH =
  "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  description?: string;
  created_at: string;
  debt_items?: Array<{
    item_name: string;
    total_debt_value: number;
    measurement: string;
    orders: Array<{
      order_id: number;
      order_number: string;
      unloaded_value: number;
    }>;
  }>;
  total_items_count?: number;
}

interface SupplierItem {
  id: number;
  supplier_id: number;
  name: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showItemsModal, setShowItemsModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    description: "",
  });

  const [newItemName, setNewItemName] = useState("");
  const [addingItem, setAddingItem] = useState(false);

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
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      const data = await response.json();

      // Загружаем долги для каждого поставщика
      const suppliersWithDebts = await Promise.all(
        data.map(async (supplier: Supplier) => {
          try {
            const debtResponse = await fetch(
              `/api/suppliers/${supplier.id}/debt`
            );
            const debtData = await debtResponse.json();
            return {
              ...supplier,
              debt_items: debtData.debt_by_items || [],
              total_items_count: debtData.total_items_count || 0,
            };
          } catch (error) {
            console.error(
              `Ошибка загрузки долга поставщика ${supplier.id}:`,
              error
            );
            return {
              ...supplier,
              debt_items: [],
              total_items_count: 0,
            };
          }
        })
      );

      setSuppliers(suppliersWithDebts);
    } catch (error) {
      console.error("Ошибка загрузки поставщиков:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierItems = async (supplierId: number) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/items`);
      const data = await response.json();
      setSupplierItems(data);
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
    }
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : "/api/suppliers";

      const method = editingSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSuppliers();
        resetForm();
        notify.success(editingSupplier ? "Поставщик обновлен" : "Поставщик создан");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при сохранении");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    });
    setShowAddForm(false);
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone,
      email: supplier.email || "",
      address: supplier.address || "",
      description: supplier.description || "",
    });
    setEditingSupplier(supplier);
    setShowAddForm(true);
  };

  const handleDelete = guard(async (id: number) => {
    if (!await confirmAction("Вы уверены, что хотите удалить поставщика?", { danger: true })) return;

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSuppliers();
        notify.success("Поставщик удален");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при удалении");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при удалении");
    }
  });

  const handleAddItem = guard(async () => {
    if (!newItemName.trim() || !selectedSupplier) return;

    setAddingItem(true);
    try {
      const response = await fetch(
        `/api/suppliers/${selectedSupplier.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newItemName }),
        }
      );

      if (response.ok) {
        setNewItemName("");
        fetchSupplierItems(selectedSupplier.id);
        notify.success("Товар добавлен");
      } else {
        const error = await response.json();
        notify.error(error.error || "Ошибка при добавлении товара");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при добавлении товара");
    } finally {
      setAddingItem(false);
    }
  });

  const handleDeleteItem = guard(async (itemId: number) => {
    if (!await confirmAction("Удалить товар?", { danger: true })) return;

    try {
      const response = await fetch(`/api/suppliers/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (selectedSupplier) {
          fetchSupplierItems(selectedSupplier.id);
        }
        notify.success("Товар удален");
      } else {
        const data = await response.json().catch(() => ({}));
        notify.error(data.error || "Ошибка при удалении товара");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notify.error("Ошибка при удалении товара");
    }
  });

  const openItemsModal = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await fetchSupplierItems(supplier.id);
    setShowItemsModal(true);
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person &&
        supplier.contact_person
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (supplier.email &&
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex items-center justify-center py-24 text-ink-500">
          <span className="loading-spinner mr-3 text-brand-600" />
          <span className="text-sm">Загрузка поставщиков...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Поставщики"
        description="Управление поставщиками и их товарами"
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Icon name="plus" className="h-4 w-4" />
            Добавить поставщика
          </button>
        }
      />

      {/* Поиск */}
      <div className="relative mb-6 max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-ink-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={SEARCH_PATH}
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Поиск поставщиков..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Список поставщиков */}
      {filteredSuppliers.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
            <Icon name="building" className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-ink-900">
            {searchTerm ? "Поставщики не найдены" : "Нет поставщиков"}
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {searchTerm
              ? "Попробуйте изменить поисковый запрос"
              : "Добавьте первого поставщика для начала работы"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary mt-6"
            >
              <Icon name="plus" className="h-4 w-4" />
              Добавить первого поставщика
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-ink-100 bg-ink-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-500 lg:grid">
            <div className="col-span-3">Поставщик</div>
            <div className="col-span-3">Контакты</div>
            <div className="col-span-4">Долг по товарам</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>
          <ul className="divide-y divide-ink-100">
            {filteredSuppliers.map((supplier) => (
              <li
                key={supplier.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-ink-50 lg:grid-cols-12 lg:items-start lg:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3 lg:col-span-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
                    {supplier.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-900">
                      {supplier.name}
                    </div>
                    {supplier.contact_person && (
                      <div className="truncate text-xs text-ink-500">
                        {supplier.contact_person}
                      </div>
                    )}
                    <div className="text-xs text-ink-400">
                      Добавлен {formatDate(supplier.created_at)}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5 text-sm text-ink-500 lg:col-span-3">
                  <div className="truncate">{supplier.phone}</div>
                  {supplier.email && (
                    <div className="truncate">{supplier.email}</div>
                  )}
                  {supplier.address && (
                    <div className="truncate">{supplier.address}</div>
                  )}
                  {supplier.description && (
                    <div className="line-clamp-1 text-xs text-ink-400">
                      {supplier.description}
                    </div>
                  )}
                </div>

                {/* Долг поставщика по товарам */}
                <div className="min-w-0 lg:col-span-4">
                  {supplier.debt_items && supplier.debt_items.length > 0 ? (
                    <div>
                      <div className="mb-1.5 text-xs font-medium text-red-700">
                        <span className="lg:hidden">Долг по товарам: </span>
                        {supplier.total_items_count} видов
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {supplier.debt_items.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-700"
                          >
                            <span className="font-medium">
                              {item.item_name}:
                            </span>
                            &nbsp;
                            {item.total_debt_value.toFixed(2)}{" "}
                            {item.measurement}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-ink-400">—</span>
                  )}
                </div>

                <div className="flex items-center gap-1 lg:col-span-2 lg:justify-end">
                  <button
                    onClick={() => openItemsModal(supplier)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50"
                    title="Товары"
                  >
                    <Icon name="cube" className="h-4 w-4 text-ink-400" />
                    Товары
                  </button>
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    title="Редактировать"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d={EDIT_PATH}
                      />
                    </svg>
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => handleDelete(supplier.id)}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Удалить"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d={TRASH_PATH}
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Модальное окно формы поставщика */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ink-900">
                  {editingSupplier
                    ? "Редактировать поставщика"
                    : "Добавить поставщика"}
                </h3>
                <button
                  onClick={resetForm}
                  className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Название *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-field"
                    placeholder="Название поставщика"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Контактное лицо
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_person: e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="Имя контактного лица"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="input-field"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input-field"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Адрес
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="input-field"
                    placeholder="Адрес поставщика"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Дополнительная информация..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button disabled={submitting} type="submit" className="btn btn-primary flex-1">
                    {editingSupplier ? "Обновить" : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно товаров */}
      {showItemsModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">
                    Товары поставщика
                  </h3>
                  <p className="text-sm text-ink-500">
                    {selectedSupplier.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowItemsModal(false);
                    setSelectedSupplier(null);
                    setSupplierItems([]);
                  }}
                  className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              {/* Добавление товара */}
              <div className="mb-6 rounded-lg border border-ink-200 bg-ink-50 p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Название нового товара"
                    onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={submitting || (!newItemName.trim() || addingItem)}
                    className="btn btn-primary shrink-0"
                  >
                    {addingItem ? "Добавление..." : "Добавить"}
                  </button>
                </div>
              </div>

              {/* Список товаров */}
              {supplierItems.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                    <Icon name="cube" className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-ink-500">
                    У поставщика пока нет товаров
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200">
                  {supplierItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-ink-50"
                    >
                      <div>
                        <h4 className="text-sm font-medium text-ink-900">
                          {item.name}
                        </h4>
                        <p className="text-xs text-ink-500">
                          Добавлен: {formatDate(item.created_at)}
                        </p>
                      </div>
                      <button
                        disabled={submitting}
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Удалить товар"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d={TRASH_PATH}
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
