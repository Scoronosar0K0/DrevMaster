"use client";
import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney, todayLocal } from "@/lib/format";
import { notify } from "@/components/feedback";

interface Supplier {
  id: number;
  name: string;
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
}

interface SupplierItem {
  id: number;
  name: string;
}

interface Order {
  id: number;
  order_number: string;
  supplier_id: number;
  supplier_name: string;
  item_id: number;
  item_name: string;
  date: string;
  description?: string;
  measurement: string;
  value: number;
  price_per_unit?: number;
  total_price?: number;
  status: "paid" | "in_container" | "on_way" | "warehouse" | "sold" | "loan";
  containers?: number;
  container_loads?: string;
  transportation_cost?: number;
  customer_fee?: number;
  created_at: string;
}

interface ContainerLoad {
  container: number;
  value: number;
}

interface OrderContainer {
  container: number;
  value: number;
  description: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLoanPaymentDialog, setShowLoanPaymentDialog] = useState(false);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const [showOrderExpenseDialog, setShowOrderExpenseDialog] = useState(false);
  const [showContainerCreationDialog, setShowContainerCreationDialog] =
    useState(false);
  const [newlyCreatedOrder, setNewlyCreatedOrder] = useState<Order | null>(
    null
  );
  const [orderOperations, setOrderOperations] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTransportDialog, setShowTransportDialog] = useState(false);
  const [showCustomerFeeDialog, setShowCustomerFeeDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [selectedSupplierDebts, setSelectedSupplierDebts] = useState<any[]>([]);
  const [debtHandling, setDebtHandling] = useState({
    enabled: false,
    type: "subtract", // 'subtract' или 'add_to_order'
    item_name: "",
    amount: 0,
    max_amount: 0,
  });

  const [formData, setFormData] = useState({
    order_number: "",
    supplier_id: "",
    item_id: "",
    date: todayLocal(),
    description: "",
    measurement: "m3",
    value: 0,
    price_per_unit: 0,
    total_price: 0,
    isCompanyLoading: false,
  });

  const [transportForm, setTransportForm] = useState({
    cost: 0,
    selectedContainers: [] as number[],
    multipleContainers: false,
    containerCount: 1,
    containers: [] as ContainerLoad[],
    isCompanyLoading: false,
  });

  const [customerFeeForm, setCustomerFeeForm] = useState({
    cost: 0,
    value: 0,
  });

  const [sellForm, setSellForm] = useState({
    value: 0,
    price: 0,
    buyer_name: "",
    description: "",
    date: todayLocal(),
    link_to_manager: false,
    manager_id: "",
  });

  const [loanPaymentForm, setLoanPaymentForm] = useState({
    containers: [] as {
      container: number;
      value: number;
      cost: number;
      description: string;
    }[],
  });

  const [orderExpenseForm, setOrderExpenseForm] = useState({
    amount: 0,
    description: "",
  });

  const [containerCreationForm, setContainerCreationForm] = useState({
    volume: 0,
    description: "",
  });

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchOrders(),
        fetchSuppliers(),
        fetchBalance(),
        fetchManagers(),
      ]);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    const response = await fetch("/api/orders");
    const data = await response.json();
    setOrders(data);
  };

  const fetchSuppliers = async () => {
    const response = await fetch("/api/suppliers");
    const data = await response.json();
    setSuppliers(data);
  };

  const fetchSupplierDebts = async (supplierId: string) => {
    if (!supplierId) {
      setSelectedSupplierDebts([]);
      setDebtHandling((prev) => ({
        ...prev,
        enabled: false,
        item_name: "",
        amount: 0,
        max_amount: 0,
      }));
      return;
    }
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/debt`);
      const data = await response.json();
      setSelectedSupplierDebts(data.debt_by_items || []);
    } catch (error) {
      console.error("Ошибка загрузки долгов поставщика:", error);
      setSelectedSupplierDebts([]);
    }
  };

  const fetchSupplierItems = async (supplierId: string) => {
    if (!supplierId) {
      setSupplierItems([]);
      return;
    }
    const response = await fetch(`/api/suppliers/${supplierId}/items`);
    const data = await response.json();
    setSupplierItems(data);
  };

  const fetchBalance = async () => {
    const response = await fetch("/api/cash/balance");
    const data = await response.json();
    setCurrentBalance(data.balance);
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/managers");
      const data = await response.json();
      setManagers(data.filter((manager: any) => manager.is_active));
    } catch (error) {
      console.error("Ошибка загрузки менеджеров:", error);
    }
  };

  const fetchOrderOperations = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/operations`);
      const data = await response.json();
      setOrderOperations(data);
    } catch (error) {
      console.error("Ошибка загрузки операций заказа:", error);
      setOrderOperations([]);
    }
  };

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderOperations(order.id);
    setShowOrderDetailsDialog(true);
  };

  const handleAddOrderExpense = (order: Order) => {
    setSelectedOrder(order);
    setOrderExpenseForm({ amount: 0, description: "" });
    setShowOrderExpenseDialog(true);
  };

  const handleSubmitOrderExpense = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrder || orderExpenseForm.amount <= 0) {
      notify.error("Введите сумму расхода");
      return;
    }

    try {
      const response = await fetch("/api/orders/add-expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          amount: orderExpenseForm.amount,
          description: orderExpenseForm.description,
        }),
      });

      if (response.ok) {
        notify.success("Операционный расход добавлен!");
        setShowOrderExpenseDialog(false);
        setOrderExpenseForm({ amount: 0, description: "" });
        fetchData(); // Обновляем данные
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка добавления расхода:", error);
      notify.error("Ошибка добавления расхода");
    }
  });

  const handleCreateContainer = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newlyCreatedOrder || containerCreationForm.volume <= 0) {
      notify.error("Введите корректный объем контейнера");
      return;
    }

    if (containerCreationForm.volume > newlyCreatedOrder.value) {
      notify.error("Объем контейнера не может превышать общий объем заказа");
      return;
    }

    try {
      const response = await fetch("/api/orders/create-container", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: newlyCreatedOrder.id,
          volume: containerCreationForm.volume,
          description: containerCreationForm.description,
        }),
      });

      if (response.ok) {
        notify.success("Контейнер создан успешно!");
        setShowContainerCreationDialog(false);
        setNewlyCreatedOrder(null);
        setContainerCreationForm({ volume: 0, description: "" });
        fetchData(); // Обновляем данные
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка создания контейнера:", error);
      notify.error("Ошибка создания контейнера");
    }
  });

  const handleSkipContainer = () => {
    setShowContainerCreationDialog(false);
    setNewlyCreatedOrder(null);
    setContainerCreationForm({ volume: 0, description: "" });
  };

  const handleSupplierChange = (supplierId: string) => {
    setDebtHandling({
      enabled: false,
      type: "subtract",
      item_name: "",
      amount: 0,
      max_amount: 0,
    });
    setFormData({
      ...formData,
      supplier_id: supplierId,
      item_id: "",
    });
    fetchSupplierItems(supplierId);
    fetchSupplierDebts(supplierId);
  };

  const calculateTotalPrice = (value: number, pricePerUnit: number) => {
    return value * pricePerUnit;
  };

  const calculatePricePerUnit = (totalPrice: number, value: number) => {
    return value > 0 ? totalPrice / value : 0;
  };

  const handleValueChange = (newValue: number) => {
    const newTotal = calculateTotalPrice(newValue, formData.price_per_unit);
    setFormData({
      ...formData,
      value: newValue,
      total_price: newTotal,
    });
  };

  const handlePricePerUnitChange = (newPrice: number) => {
    const newTotal = calculateTotalPrice(formData.value, newPrice);
    setFormData({
      ...formData,
      price_per_unit: newPrice,
      total_price: newTotal,
    });
  };

  const handleTotalPriceChange = (newTotal: number) => {
    const newPricePerUnit = calculatePricePerUnit(newTotal, formData.value);
    setFormData({
      ...formData,
      total_price: newTotal,
      price_per_unit: newPricePerUnit,
    });
  };

  const getOrderContainers = (order: Order): OrderContainer[] => {
    if (order.container_loads) {
      try {
        const loads = JSON.parse(order.container_loads);
        return loads.map((load: any, index: number) => ({
          container: index + 1,
          value: load.value || order.value,
          description: load.description || `Контейнер ${index + 1}`,
        }));
      } catch (e) {
        console.error("Ошибка парсинга контейнеров:", e);
      }
    }

    // Если нет container_loads, создаем контейнеры на основе общего объема
    const containerCount = order.containers || 1;
    const valuePerContainer = order.value / containerCount;

    return Array.from({ length: containerCount }, (_, index) => ({
      container: index + 1,
      value: valuePerContainer,
      description: `Контейнер ${index + 1}`,
    }));
  };

  const toggleContainerSelection = (containerNum: number) => {
    const selected = transportForm.selectedContainers;
    const newSelected = selected.includes(containerNum)
      ? selected.filter((c) => c !== containerNum)
      : [...selected, containerNum];

    setTransportForm({
      ...transportForm,
      selectedContainers: newSelected,
    });
  };

  const handleSubmit = guard(async (e: React.FormEvent) => {
    e.preventDefault();

    // Подготавливаем данные заказа с учетом работы с долгами
    let finalOrderData = { ...formData };
    let finalTotalPrice = formData.total_price;

    if (debtHandling.enabled && debtHandling.amount > 0) {
      if (debtHandling.type === "subtract") {
        // Вычитаем стоимость долга из итоговой цены
        const debtValue = debtHandling.amount * (formData.price_per_unit || 0);
        finalTotalPrice = formData.total_price - debtValue;
      } else if (debtHandling.type === "add_to_order") {
        // Добавляем объем долга к заказу, но цена остается прежней
        // так как долговой товар уже был оплачен ранее
        finalOrderData.value = formData.value + debtHandling.amount;
        finalTotalPrice = formData.total_price; // Цена НЕ изменяется
      }
      finalOrderData.total_price = finalTotalPrice;
    }

    // Проверяем баланс (загрузка от компании оформляется в займ и кассу не тратит)
    if (!formData.isCompanyLoading && finalTotalPrice > currentBalance) {
      notify.error(
        `Недостаточно средств! Необходимо: ${formatMoney(
          finalTotalPrice
        )}, Доступно: ${formatMoney(currentBalance)}`
      );
      return;
    }

    try {
      const orderData = {
        ...finalOrderData,
        debt_handling: debtHandling.enabled
          ? {
              type: debtHandling.type,
              item_name: debtHandling.item_name,
              amount: debtHandling.amount,
              original_total_price: formData.total_price,
              final_total_price: finalTotalPrice,
            }
          : null,
        // Новые поля для загрузки от компании
        isCompanyLoading: formData.isCompanyLoading,
        status: formData.isCompanyLoading ? "loan" : undefined, // Если загрузка от компании, то статус "loan"
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();
        const createdOrder = result.order;
        await fetchData();
        setShowAddForm(false);
        resetForm();

        // Показываем диалог создания контейнера для нового заказа
        setNewlyCreatedOrder(createdOrder);
        setContainerCreationForm({
          volume: createdOrder.value || 0,
          description: "",
        });
        setShowContainerCreationDialog(true);
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка создания заказа:", error);
      notify.error("Ошибка создания заказа");
    }
  });

  const resetForm = () => {
    setFormData({
      order_number: "",
      supplier_id: "",
      item_id: "",
      date: todayLocal(),
      description: "",
      measurement: "m3",
      value: 0,
      price_per_unit: 0,
      total_price: 0,
      isCompanyLoading: false,
    });
    setSupplierItems([]);
    // Зачет долга относится к конкретному поставщику и товару — сбрасываем,
    // иначе он незаметно уменьшил бы цену следующего заказа
    setDebtHandling({
      enabled: false,
      type: "subtract",
      item_name: "",
      amount: 0,
      max_amount: 0,
    });
    setSelectedSupplierDebts([]);
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    if (order.status === "paid") {
      // Для заказов со статусом paid показываем диалог создания контейнера
      setNewlyCreatedOrder(order);
      setContainerCreationForm({
        volume: order.value || 0,
        description: "",
      });
      setShowContainerCreationDialog(true);
    } else if (order.status === "in_container") {
      // Для заказов в контейнерах показываем оплату транспортировки
      setTransportForm({
        cost: 0,
        selectedContainers: [],
        multipleContainers: false,
        containerCount: 1,
        containers: [],
        isCompanyLoading: false,
      });
      setShowTransportDialog(true);
    } else if (order.status === "on_way") {
      setCustomerFeeForm({ cost: 0, value: order.value });
      setShowCustomerFeeDialog(true);
    } else if (order.status === "warehouse") {
      setSellForm({
        value: 0,
        price: 0,
        buyer_name: "",
        description: "",
        date: todayLocal(),
        link_to_manager: false,
        manager_id: "",
      });
      setShowSellDialog(true);
    } else if (order.status === "loan") {
      setLoanPaymentForm({
        containers: [],
      });
      setShowLoanPaymentDialog(true);
    }
  };

  const handlePayTransportation = guard(async () => {
    if (!selectedOrder) return;

    const containers = getOrderContainers(selectedOrder);
    const selectedContainerData = containers.filter((c: ContainerLoad) =>
      transportForm.selectedContainers.includes(c.container)
    );
    const totalValue = selectedContainerData.reduce(
      (sum: number, c: ContainerLoad) => sum + c.value,
      0
    );

    try {
      const response = await fetch(
        `/api/orders/${selectedOrder.id}/pay-transportation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cost: transportForm.cost,
            value: totalValue,
            containers: transportForm.selectedContainers,
          }),
        }
      );

      if (response.ok) {
        await fetchData();
        setShowTransportDialog(false);
        setSelectedOrder(null);
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка оплаты транспортировки:", error);
      notify.error("Ошибка оплаты транспортировки");
    }
  });

  const handlePayCustomerFee = guard(async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(
        `/api/orders/${selectedOrder.id}/pay-customer-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(customerFeeForm),
        }
      );

      if (response.ok) {
        await fetchData();
        setShowCustomerFeeDialog(false);
        setSelectedOrder(null);
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка оплаты таможенного сбора:", error);
      notify.error("Ошибка оплаты таможенного сбора");
    }
  });

  const handleSellOrder = guard(async () => {
    if (!selectedOrder) return;

    if (sellForm.link_to_manager && !sellForm.manager_id) {
      notify.error("Выберите менеджера для продажи в долг");
      return;
    }

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sellForm),
      });

      if (response.ok) {
        await fetchData();
        setShowSellDialog(false);
        setSelectedOrder(null);
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка продажи:", error);
      notify.error("Ошибка продажи");
    }
  });

  const handleLoanPayment = guard(async () => {
    if (!selectedOrder) return;

    const totalCost = loanPaymentForm.containers.reduce(
      (
        sum: number,
        container: {
          container: number;
          value: number;
          cost: number;
          description: string;
        }
      ) => sum + container.cost,
      0
    );

    if (totalCost === 0 || loanPaymentForm.containers.length === 0) {
      notify.error("Добавьте хотя бы один контейнер для оплаты");
      return;
    }

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/pay-loan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containers: loanPaymentForm.containers,
          totalCost: totalCost,
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowLoanPaymentDialog(false);
        setSelectedOrder(null);
      } else {
        const error = await response.json();
        notify.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка оплаты займа:", error);
      notify.error("Ошибка оплаты займа");
    }
  });

  const addLoanContainer = () => {
    const nextContainerNumber =
      Math.max(
        0,
        ...loanPaymentForm.containers.map(
          (c: {
            container: number;
            value: number;
            cost: number;
            description: string;
          }) => c.container
        )
      ) + 1;
    setLoanPaymentForm({
      ...loanPaymentForm,
      containers: [
        ...loanPaymentForm.containers,
        {
          container: nextContainerNumber,
          value: 0,
          cost: 0,
          description: "",
        },
      ],
    });
  };

  const updateLoanContainer = (index: number, field: string, value: any) => {
    const updatedContainers = [...loanPaymentForm.containers];
    updatedContainers[index] = {
      ...updatedContainers[index],
      [field]: value,
    };
    setLoanPaymentForm({
      ...loanPaymentForm,
      containers: updatedContainers,
    });
  };

  const removeLoanContainer = (index: number) => {
    setLoanPaymentForm({
      ...loanPaymentForm,
      containers: loanPaymentForm.containers.filter(
        (_: any, i: number) => i !== index
      ),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "status-info";
      case "in_container":
        return "bg-ink-100 text-ink-700";
      case "on_way":
        return "bg-brand-100 text-brand-700";
      case "warehouse":
        return "status-success";
      case "sold":
        return "bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200";
      case "loan":
        return "status-danger";
      default:
        return "bg-ink-100 text-ink-700";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Оплачен";
      case "in_container":
        return "В контейнере";
      case "on_way":
        return "В пути";
      case "warehouse":
        return "На складе";
      case "sold":
        return "Продан";
      case "loan":
        return "Не оплачено";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Заголовок и баланс */}
      <PageHeader
        title="Заказы"
        description="Закупки у поставщиков: контейнеры, доставка, таможня и продажа"
        actions={
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm">
              <span className="text-ink-500">Доступно:</span>
              <span className="font-semibold text-ink-900">
                {formatMoney(currentBalance)}
              </span>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
            >
              <Icon name="plus" className="h-4 w-4" />
              Новый заказ
            </button>
          </>
        }
      />

      {/* Список заказов */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-base font-semibold text-ink-900">Все заказы</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-200">
            <thead className="bg-ink-50">
              <tr>
                <th className="table-header sticky-first-col z-20 bg-ink-50 px-4">
                  Поставщик
                </th>
                <th className="table-header px-4">Заказ и товар</th>
                <th className="table-header px-4 text-right">Количество</th>
                <th className="table-header px-4 text-right">Стоимость</th>
                <th className="table-header px-4">Статус</th>
                <th className="table-header px-4">Дата</th>
                <th className="table-header px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="group hover:bg-ink-50">
                  <td
                    className="table-cell sticky-first-col z-10 cursor-pointer bg-white px-4 py-3 font-medium group-hover:bg-ink-50"
                    onClick={() => handleOrderClick(order)}
                  >
                    {order.supplier_name}
                  </td>
                  <td
                    className="table-cell cursor-pointer px-4 py-3"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="font-medium">{order.order_number}</div>
                    <div className="text-xs text-ink-500">{order.item_name}</div>
                  </td>
                  <td
                    className="table-cell cursor-pointer px-4 py-3 text-right text-ink-700"
                    onClick={() => handleOrderClick(order)}
                  >
                    {order.value} {order.measurement}
                  </td>
                  <td
                    className="table-cell cursor-pointer px-4 py-3 text-right font-medium"
                    onClick={() => handleOrderClick(order)}
                  >
                    {formatMoney(order.total_price)}
                  </td>
                  <td
                    className="table-cell cursor-pointer px-4 py-3"
                    onClick={() => handleOrderClick(order)}
                  >
                    <span
                      className={`status-badge ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td
                    className="table-cell cursor-pointer px-4 py-3 text-ink-600"
                    onClick={() => handleOrderClick(order)}
                  >
                    {formatDate(order.date)}
                  </td>
                  <td className="table-cell px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOrder(order);
                        }}
                        className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                        title="Просмотр операций"
                      >
                        <Icon name="eye" className="h-4 w-4" />
                      </button>

                      {/* Кнопка добавления операционных расходов */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddOrderExpense(order);
                        }}
                        className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        title="Добавить операционные расходы"
                      >
                        <Icon name="plus" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    Заказов пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Форма добавления заказа */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <h2 className="mb-5 text-lg font-semibold text-ink-900">
                Новый заказ
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Номер заказа */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Номер заказа *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.order_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          order_number: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="Введите номер заказа"
                    />
                  </div>

                  {/* Поставщик */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Поставщик *
                    </label>
                    <select
                      required
                      value={formData.supplier_id}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="input-field"
                      title="Выберите поставщика"
                    >
                      <option value="">Выберите поставщика</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Товар */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Товар *
                    </label>
                    <select
                      required
                      value={formData.item_id}
                      onChange={(e) =>
                        setFormData({ ...formData, item_id: e.target.value })
                      }
                      className="input-field"
                      title="Выберите товар"
                      disabled={!formData.supplier_id}
                    >
                      <option value="">Выберите товар</option>
                      {supplierItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Дата */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Дата *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="input-field"
                      title="Выберите дату заказа"
                    />
                  </div>

                  {/* Описание */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Описание
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="Введите описание заказа"
                    />
                  </div>

                  {/* Измерение */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Измерение *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.measurement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          measurement: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="m3"
                    />
                  </div>

                  {/* Количество */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Количество *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formData.value}
                      onChange={(e) =>
                        handleValueChange(parseFloat(e.target.value) || 0)
                      }
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Цена за единицу */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Цена за единицу ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formData.price_per_unit}
                      onChange={(e) =>
                        handlePricePerUnitChange(
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Общая стоимость */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Общая стоимость ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={formData.total_price}
                      onChange={(e) =>
                        handleTotalPriceChange(parseFloat(e.target.value) || 0)
                      }
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Работа с долгами поставщика */}
                {selectedSupplierDebts.length > 0 && (
                  <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-amber-800">
                      Долги поставщика
                    </h4>

                    {selectedSupplierDebts.map((debt, idx) => (
                      <div
                        key={idx}
                        className="mb-3 rounded-lg border border-amber-100 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-ink-900">
                            {debt.item_name}: {debt.total_debt_value.toFixed(2)}{" "}
                            {debt.measurement}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const selectedItem = supplierItems.find(
                                (item) => item.name === debt.item_name
                              );
                              if (
                                selectedItem &&
                                selectedItem.id === parseInt(formData.item_id)
                              ) {
                                setDebtHandling({
                                  enabled: true,
                                  type: "subtract",
                                  item_name: debt.item_name,
                                  amount: Math.min(
                                    debt.total_debt_value,
                                    formData.value
                                  ),
                                  max_amount: Math.min(
                                    debt.total_debt_value,
                                    formData.value
                                  ),
                                });
                              }
                            }}
                            disabled={
                              !supplierItems.find(
                                (item) =>
                                  item.name === debt.item_name &&
                                  item.id === parseInt(formData.item_id)
                              )
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              supplierItems.find(
                                (item) =>
                                  item.name === debt.item_name &&
                                  item.id === parseInt(formData.item_id)
                              )
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "cursor-not-allowed bg-ink-100 text-ink-400"
                            }`}
                          >
                            Зачесть долг
                          </button>
                        </div>
                        {!supplierItems.find(
                          (item) =>
                            item.name === debt.item_name &&
                            item.id === parseInt(formData.item_id)
                        ) && (
                          <p className="text-xs text-amber-700">
                            Этот товар не выбран в заказе
                          </p>
                        )}
                      </div>
                    ))}

                    {debtHandling.enabled && (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-white p-4">
                        <h5 className="mb-3 text-sm font-semibold text-ink-900">
                          Работа с долгом: {debtHandling.item_name}
                        </h5>

                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-ink-700">
                              Тип операции
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center text-sm text-ink-800">
                                <input
                                  type="radio"
                                  name="debtType"
                                  value="subtract"
                                  checked={debtHandling.type === "subtract"}
                                  onChange={(e) =>
                                    setDebtHandling((prev) => ({
                                      ...prev,
                                      type: e.target.value,
                                    }))
                                  }
                                  className="mr-2 h-4 w-4 accent-brand-600"
                                />
                                Вычесть из стоимости заказа
                              </label>
                              <label className="flex items-center text-sm text-ink-800">
                                <input
                                  type="radio"
                                  name="debtType"
                                  value="add_to_order"
                                  checked={debtHandling.type === "add_to_order"}
                                  onChange={(e) =>
                                    setDebtHandling((prev) => ({
                                      ...prev,
                                      type: e.target.value,
                                    }))
                                  }
                                  className="mr-2 h-4 w-4 accent-brand-600"
                                />
                                Добавить к объему заказа
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-ink-700">
                              Количество ({formData.measurement})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={debtHandling.max_amount}
                              value={debtHandling.amount}
                              onChange={(e) =>
                                setDebtHandling((prev) => ({
                                  ...prev,
                                  amount: Math.min(
                                    parseFloat(e.target.value) || 0,
                                    prev.max_amount
                                  ),
                                }))
                              }
                              className="input-field"
                              placeholder="0.00"
                            />
                            <p className="mt-1 text-xs text-ink-500">
                              Максимум: {debtHandling.max_amount.toFixed(2)}{" "}
                              {formData.measurement}
                            </p>
                          </div>

                          {debtHandling.type === "subtract" && (
                            <div className="rounded-lg bg-emerald-50 px-3 py-2">
                              <p className="text-sm text-emerald-800">
                                Итоговая стоимость:{" "}
                                <span className="font-semibold">
                                  {formatMoney(
                                    formData.total_price -
                                      debtHandling.amount *
                                        (formData.price_per_unit || 0)
                                  )}
                                </span>
                                <span className="ml-2 text-emerald-700">
                                  (экономия:{" "}
                                  {formatMoney(
                                    debtHandling.amount *
                                      (formData.price_per_unit || 0)
                                  )}
                                  )
                                </span>
                              </p>
                            </div>
                          )}

                          {debtHandling.type === "add_to_order" && (
                            <div className="rounded-lg bg-brand-50 px-3 py-2">
                              <p className="text-sm text-brand-700">
                                Новый объем заказа:{" "}
                                {(formData.value + debtHandling.amount).toFixed(
                                  2
                                )}{" "}
                                {formData.measurement}
                                <span className="ml-2 text-brand-600">
                                  (+{debtHandling.amount.toFixed(2)}{" "}
                                  {formData.measurement} от долга)
                                </span>
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDebtHandling((prev) => ({
                                  ...prev,
                                  enabled: false,
                                }))
                              }
                              className="btn btn-secondary px-3 py-1.5 text-xs"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Чекбокс для загрузки от компании (займ) */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="companyLoading"
                    checked={formData.isCompanyLoading}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isCompanyLoading: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                  />
                  <label
                    htmlFor="companyLoading"
                    className="ml-2 text-sm text-ink-800"
                  >
                    Загружается от компании (займ)
                  </label>
                </div>

                {/* Кнопки */}
                <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Отмена
                  </button>
                  <button disabled={submitting} type="submit" className="btn btn-primary">
                    Создать заказ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Диалог оплаты транспортировки */}
      {showTransportDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-ink-900">
                Оплата транспортировки
              </h3>
              <p className="mb-4 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                Заказ: {selectedOrder.order_number}
                <br />
                Общий объем: {selectedOrder.value} {selectedOrder.measurement}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Стоимость транспортировки ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transportForm.cost}
                    onChange={(e) =>
                      setTransportForm({
                        ...transportForm,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
                {/* Выбор существующих контейнеров (если не создаем новые) */}
                {!transportForm.multipleContainers && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink-700">
                      Выберите контейнеры для транспортировки:
                    </label>
                    <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto">
                      {getOrderContainers(selectedOrder).map(
                        (container: ContainerLoad) => (
                          <label
                            key={container.container}
                            className="flex cursor-pointer items-center rounded-lg border border-ink-200 p-3 transition-colors hover:bg-ink-50"
                          >
                            <input
                              type="checkbox"
                              checked={transportForm.selectedContainers.includes(
                                container.container
                              )}
                              onChange={() =>
                                toggleContainerSelection(container.container)
                              }
                              className="mr-3 h-4 w-4 rounded border-ink-300 accent-brand-600"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-ink-900">
                                Контейнер {container.container}
                              </div>
                              <div className="text-sm text-ink-500">
                                {container.value.toFixed(2)}{" "}
                                {selectedOrder.measurement}
                              </div>
                            </div>
                          </label>
                        )
                      )}
                    </div>
                    {transportForm.selectedContainers.length > 0 && (
                      <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                        Выбрано контейнеров:{" "}
                        {transportForm.selectedContainers.length}
                        <br />
                        Общий объем:{" "}
                        {getOrderContainers(selectedOrder)
                          .filter((c: ContainerLoad) =>
                            transportForm.selectedContainers.includes(
                              c.container
                            )
                          )
                          .reduce(
                            (sum: number, c: ContainerLoad) => sum + c.value,
                            0
                          )
                          .toFixed(2)}{" "}
                        {selectedOrder.measurement}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-ink-100 pt-4">
                <button
                  onClick={() => {
                    setShowTransportDialog(false);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={handlePayTransportation}
                  disabled={submitting || (transportForm.selectedContainers.length === 0)}
                  className="btn btn-primary"
                >
                  Оплатить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог оплаты таможенного сбора */}
      {showCustomerFeeDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-ink-900">
                Оплата таможенного сбора
              </h3>
              <p className="mb-4 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                Заказ: {selectedOrder.order_number}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Объем ({selectedOrder.measurement})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedOrder.value}
                    value={customerFeeForm.value || selectedOrder.value}
                    onChange={(e) =>
                      setCustomerFeeForm({
                        ...customerFeeForm,
                        value:
                          parseFloat(e.target.value) || selectedOrder.value,
                      })
                    }
                    className="input-field"
                    placeholder={selectedOrder.value.toString()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Стоимость таможенного сбора ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customerFeeForm.cost}
                    onChange={(e) =>
                      setCustomerFeeForm({
                        ...customerFeeForm,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-ink-100 pt-4">
                <button
                  onClick={() => {
                    setShowCustomerFeeDialog(false);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button
                  disabled={submitting}
                  onClick={handlePayCustomerFee}
                  className="btn btn-primary"
                >
                  Оплатить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог продажи */}
      {showSellDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-ink-900">
                Продажа товара
              </h3>
              <p className="mb-4 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                Заказ: {selectedOrder.order_number}
                <br />
                Доступно: {selectedOrder.value} {selectedOrder.measurement}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Объем продажи ({selectedOrder.measurement}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={selectedOrder.value}
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
                    Цена за единицу ($) *
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
                  {/* Сервер умножает цену на объем — показываем итоговую сумму */}
                  <p className="mt-1 text-xs text-ink-500">
                    Итого: {formatMoney(sellForm.value * sellForm.price)}
                  </p>
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
                    placeholder="Описание продажи"
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
                    title="Выберите дату продажи"
                  />
                </div>

                {/* Связь с менеджером */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="linkToManager"
                      checked={sellForm.link_to_manager}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setSellForm({
                          ...sellForm,
                          link_to_manager: isChecked,
                          manager_id: isChecked ? sellForm.manager_id : "",
                          buyer_name:
                            isChecked && sellForm.manager_id
                              ? managers.find(
                                  (m) => m.id.toString() === sellForm.manager_id
                                )?.name || sellForm.buyer_name
                              : sellForm.buyer_name,
                        });
                      }}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-600"
                    />
                    <label
                      htmlFor="linkToManager"
                      className="ml-2 text-sm text-ink-800"
                    >
                      Связать продажу с менеджером (автоматически увеличить его
                      займ)
                    </label>
                  </div>

                  {sellForm.link_to_manager && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-700">
                        Менеджер *
                      </label>
                      <select
                        required={sellForm.link_to_manager}
                        value={sellForm.manager_id}
                        onChange={(e) => {
                          const selectedManagerId = e.target.value;
                          const selectedManager = managers.find(
                            (m) => m.id.toString() === selectedManagerId
                          );
                          setSellForm({
                            ...sellForm,
                            manager_id: selectedManagerId,
                            buyer_name: selectedManager
                              ? selectedManager.name
                              : sellForm.buyer_name,
                          });
                        }}
                        className="input-field"
                        title="Выберите менеджера"
                      >
                        <option value="">Выберите менеджера</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name} (@{manager.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-ink-100 pt-4">
                <button
                  onClick={() => {
                    setShowSellDialog(false);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
                <button disabled={submitting} onClick={handleSellOrder} className="btn btn-primary">
                  Продать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог оплаты займа */}
      {showLoanPaymentDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-ink-900">
                Оплата займа
              </h3>
              <p className="mb-4 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                Заказ: {selectedOrder.order_number}
                <br />
                Общий объем: {selectedOrder.value} {selectedOrder.measurement}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Выберите контейнеры для оплаты займа:
                  </label>
                  <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto">
                    {getOrderContainers(selectedOrder).map(
                      (container: OrderContainer, index: number) => (
                        <div
                          key={index}
                          className="flex cursor-pointer items-center rounded-lg border border-ink-200 p-3 transition-colors hover:bg-ink-50"
                        >
                          <input
                            type="checkbox"
                            checked={loanPaymentForm.containers.some(
                              (c) => c.container === container.container
                            )}
                            onChange={() => {
                              const newContainers = [
                                ...loanPaymentForm.containers,
                              ];
                              const containerIndex = newContainers.findIndex(
                                (c: {
                                  container: number;
                                  value: number;
                                  cost: number;
                                  description: string;
                                }) => c.container === container.container
                              );
                              if (containerIndex !== -1) {
                                newContainers.splice(containerIndex, 1);
                              } else {
                                // Вычисляем цену за единицу на основе изначальной цены заказа
                                const pricePerUnit =
                                  selectedOrder.price_per_unit ||
                                  (selectedOrder.total_price || 0) /
                                    selectedOrder.value;
                                const containerCost =
                                  container.value * pricePerUnit;

                                newContainers.push({
                                  container: container.container,
                                  value: container.value,
                                  cost: containerCost,
                                  description: `Оплата за ${container.value.toFixed(
                                    2
                                  )} ${selectedOrder.measurement}`,
                                });
                              }
                              setLoanPaymentForm({
                                ...loanPaymentForm,
                                containers: newContainers,
                              });
                            }}
                            className="mr-3 h-4 w-4 rounded border-ink-300 accent-brand-600"
                            title="Выбрать контейнер для оплаты"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-ink-900">
                              Контейнер {container.container}
                            </div>
                            <div className="text-sm text-ink-500">
                              {container.value.toFixed(2)}{" "}
                              {selectedOrder.measurement}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  {loanPaymentForm.containers.length > 0 && (
                    <div className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                      Выбрано контейнеров: {loanPaymentForm.containers.length}
                      <br />
                      Общий объем:{" "}
                      {loanPaymentForm.containers
                        .reduce(
                          (
                            sum: number,
                            c: {
                              container: number;
                              value: number;
                              cost: number;
                              description: string;
                            }
                          ) => sum + c.value,
                          0
                        )
                        .toFixed(2)}{" "}
                      {selectedOrder.measurement}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {loanPaymentForm.containers.map((container, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-ink-200 bg-ink-50 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium text-ink-900">
                          Контейнер {container.container}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeLoanContainer(index)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Удалить
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-ink-700">
                            Объем ({selectedOrder.measurement})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={container.value}
                            value={container.value}
                            onChange={(e) =>
                              updateLoanContainer(
                                index,
                                "value",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-field"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-ink-700">
                            Стоимость ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={container.cost}
                            onChange={(e) =>
                              updateLoanContainer(
                                index,
                                "cost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-field"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="mb-1 block text-sm font-medium text-ink-700">
                            Описание
                          </label>
                          <input
                            type="text"
                            value={container.description}
                            onChange={(e) =>
                              updateLoanContainer(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            className="input-field"
                            placeholder="Описание оплаты"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                  <button
                    type="button"
                    onClick={addLoanContainer}
                    className="btn btn-secondary"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Добавить контейнер
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowLoanPaymentDialog(false)}
                      className="btn btn-secondary"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleLoanPayment}
                      disabled={
                        submitting ||
                        loanPaymentForm.containers.length === 0 ||
                        loanPaymentForm.containers.some(
                          (c) => c.value === 0 || c.cost === 0
                        )
                      }
                      className="btn btn-primary"
                    >
                      Оплатить займ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог создания контейнера для нового заказа */}
      {showContainerCreationDialog && newlyCreatedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  Создать контейнер
                </h3>
                <button
                  onClick={handleSkipContainer}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                  Заказ: {newlyCreatedOrder.order_number}
                  <br />
                  Общий объем: {newlyCreatedOrder.value}{" "}
                  {newlyCreatedOrder.measurement}
                  <br />
                  Поставщик: {newlyCreatedOrder.supplier_name}
                </p>
              </div>

              <form onSubmit={handleCreateContainer} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Объем контейнера ({newlyCreatedOrder.measurement}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={newlyCreatedOrder.value}
                    required
                    value={containerCreationForm.volume || ""}
                    onChange={(e) =>
                      setContainerCreationForm({
                        ...containerCreationForm,
                        volume: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder={`Максимум: ${newlyCreatedOrder.value}`}
                    title="Введите объем контейнера"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Описание контейнера
                  </label>
                  <textarea
                    value={containerCreationForm.description}
                    onChange={(e) =>
                      setContainerCreationForm({
                        ...containerCreationForm,
                        description: e.target.value,
                      })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Описание контейнера (необязательно)"
                    title="Введите описание контейнера"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
                  <button
                    type="button"
                    onClick={handleSkipContainer}
                    className="btn btn-secondary"
                  >
                    Пропустить
                  </button>
                  <button
                    disabled={submitting}
                    type="submit"
                    className="btn btn-primary"
                  >
                    Создать контейнер
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Диалог добавления операционных расходов */}
      {showOrderExpenseDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  Добавить операционные расходы
                </h3>
                <button
                  onClick={() => setShowOrderExpenseDialog(false)}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                  Заказ: {selectedOrder.order_number}
                  <br />
                  Поставщик: {selectedOrder.supplier_name}
                </p>
              </div>

              <form onSubmit={handleSubmitOrderExpense} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Сумма расхода ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={orderExpenseForm.amount || ""}
                    onChange={(e) =>
                      setOrderExpenseForm({
                        ...orderExpenseForm,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input-field"
                    placeholder="0.00"
                    title="Введите сумму операционного расхода"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-700">
                    Описание
                  </label>
                  <textarea
                    value={orderExpenseForm.description}
                    onChange={(e) =>
                      setOrderExpenseForm({
                        ...orderExpenseForm,
                        description: e.target.value,
                      })
                    }
                    className="input-field"
                    rows={3}
                    placeholder="Описание операционного расхода (необязательно)"
                    title="Введите описание расхода"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowOrderExpenseDialog(false)}
                    className="btn btn-secondary"
                  >
                    Отмена
                  </button>
                  <button
                    disabled={submitting}
                    type="submit"
                    className="btn btn-primary"
                  >
                    Добавить расход
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра операций заказа */}
      {showOrderDetailsDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  История операций заказа {selectedOrder.order_number}
                </h3>
                <button
                  onClick={() => setShowOrderDetailsDialog(false)}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Закрыть"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              {/* Основная информация о заказе */}
              <div className="mb-6 rounded-lg border border-ink-200 bg-ink-50 p-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <span className="text-xs font-medium text-ink-500">
                      Поставщик:
                    </span>
                    <p className="mt-0.5 text-sm font-medium text-ink-900">
                      {selectedOrder.supplier_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink-500">
                      Товар:
                    </span>
                    <p className="mt-0.5 text-sm font-medium text-ink-900">
                      {selectedOrder.item_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink-500">
                      Количество:
                    </span>
                    <p className="mt-0.5 text-sm font-medium text-ink-900">
                      {selectedOrder.value} {selectedOrder.measurement}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-ink-500">
                      Текущая стоимость:
                    </span>
                    <p className="mt-0.5 text-sm font-semibold text-ink-900">
                      {formatMoney(selectedOrder.total_price)}
                    </p>
                  </div>
                </div>
              </div>

              {/* История операций */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-ink-900">
                  История операций
                </h4>
                {orderOperations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ink-200 py-8 text-center">
                    <p className="text-sm text-ink-500">Операций не найдено</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderOperations.map((operation, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-ink-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <div className="shrink-0 rounded-lg bg-ink-100 p-2 text-ink-600">
                              <Icon
                                name={getOperationIcon(operation.action)}
                                className="h-4 w-4"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2">
                                <span className="text-sm font-medium text-ink-900">
                                  {getOperationTitle(operation.action)}
                                </span>
                                {operation.amount && (
                                  <span className="text-sm font-semibold text-ink-900">
                                    {formatMoney(operation.amount)}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-ink-600">
                                {operation.details}
                              </p>
                            </div>
                          </div>
                          <div className="whitespace-nowrap text-xs text-ink-500">
                            {formatDateTime(operation.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-ink-100 pt-4">
                <button
                  onClick={() => setShowOrderDetailsDialog(false)}
                  className="btn btn-secondary"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Вспомогательные функции для отображения операций
  function getOperationIcon(action: string): IconName {
    switch (action) {
      case "заказ_создан":
        return "cube";
      case "оплата_транспорта":
        return "truck";
      case "оплата_таможни":
        return "shield";
      case "оплата_займа":
        return "wallet";
      case "продажа":
        return "trendUp";
      case "продажа_менеджера":
        return "user";
      case "увеличение_цены_заказа":
        return "chart";
      case "создание_расхода":
        return "plus";
      default:
        return "clock";
    }
  }

  function getOperationTitle(action: string) {
    switch (action) {
      case "заказ_создан":
        return "Заказ создан";
      case "оплата_транспорта":
        return "Оплата транспортировки";
      case "оплата_таможни":
        return "Оплата таможни";
      case "оплата_займа":
        return "Оплата займа";
      case "продажа":
        return "Продажа";
      case "увеличение_цены_заказа":
        return "Увеличение стоимости";
      case "создание_расхода":
        return "Дополнительный расход";
      default:
        return action;
    }
  }
}
