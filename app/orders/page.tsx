"use client";
import { useState, useEffect } from "react";

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
  status: "paid" | "on_way" | "warehouse" | "sold" | "loan";
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
    date: new Date().toISOString().split("T")[0],
    description: "",
    measurement: "m3",
    value: 0,
    price_per_unit: 0,
    total_price: 0,
    multipleContainers: false,
    containerCount: 1,
    containers: [] as ContainerLoad[],
    isCompanyLoading: false,
    selectedContainersForPayment: [] as number[],
  });

  const [transportForm, setTransportForm] = useState({
    cost: 0,
    selectedContainers: [] as number[],
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
    date: new Date().toISOString().split("T")[0],
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

  const handleSupplierChange = (supplierId: string) => {
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
    updateContainers(newValue);
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

  const updateContainers = (totalValue: number) => {
    if (formData.multipleContainers) {
      const valuePerContainer = totalValue / formData.containerCount;
      const newContainers = Array.from(
        { length: formData.containerCount },
        (_, i) => ({
          container: i + 1,
          value: valuePerContainer,
        })
      );
      setFormData({
        ...formData,
        containers: newContainers,
      });
    }
  };

  const handleContainerCountChange = (count: number) => {
    const valuePerContainer = formData.value / count;
    const newContainers = Array.from({ length: count }, (_, i) => ({
      container: i + 1,
      value: valuePerContainer,
    }));
    setFormData({
      ...formData,
      containerCount: count,
      containers: newContainers,
    });
  };

  const handleContainerValueChange = (
    containerIndex: number,
    value: number
  ) => {
    const newContainers = [...formData.containers];
    newContainers[containerIndex].value = value;
    setFormData({
      ...formData,
      containers: newContainers,
    });
  };

  const getTotalLoadedValue = () => {
    return formData.containers.reduce(
      (total, container) => total + container.value,
      0
    );
  };

  const getUnloadedValue = () => {
    const totalLoaded = getTotalLoadedValue();
    return Math.max(0, formData.value - totalLoaded);
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Проверяем баланс
    if (finalTotalPrice > currentBalance) {
      alert(
        `Недостаточно средств! Необходимо: $${finalTotalPrice.toFixed(
          2
        )}, Доступно: $${currentBalance.toFixed(2)}`
      );
      return;
    }

    try {
      const orderData = {
        ...finalOrderData,
        containers: formData.multipleContainers
          ? formData.containers
          : undefined,
        unloaded_value: formData.multipleContainers ? getUnloadedValue() : 0,
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
        selectedContainersForPayment: formData.selectedContainersForPayment,
        status: formData.isCompanyLoading ? "loan" : undefined, // Если загрузка от компании, то статус "loan"
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        await fetchData();
        setShowAddForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка создания заказа:", error);
      alert("Ошибка создания заказа");
    }
  };

  const resetForm = () => {
    setFormData({
      order_number: "",
      supplier_id: "",
      item_id: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      measurement: "m3",
      value: 0,
      price_per_unit: 0,
      total_price: 0,
      multipleContainers: false,
      containerCount: 1,
      containers: [],
      isCompanyLoading: false,
      selectedContainersForPayment: [],
    });
    setSupplierItems([]);
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    if (order.status === "paid") {
      setTransportForm({ cost: 0, selectedContainers: [] });
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
        date: new Date().toISOString().split("T")[0],
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

  const handlePayTransportation = async () => {
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
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка оплаты транспортировки:", error);
      alert("Ошибка оплаты транспортировки");
    }
  };

  const handlePayCustomerFee = async () => {
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
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка оплаты таможенного сбора:", error);
      alert("Ошибка оплаты таможенного сбора");
    }
  };

  const handleSellOrder = async () => {
    if (!selectedOrder) return;

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
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка продажи:", error);
      alert("Ошибка продажи");
    }
  };

  const handleLoanPayment = async () => {
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
      alert("Добавьте хотя бы один контейнер для оплаты");
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
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error("Ошибка оплаты займа:", error);
      alert("Ошибка оплаты займа");
    }
  };

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
        return "bg-blue-100 text-blue-800";
      case "on_way":
        return "bg-yellow-100 text-yellow-800";
      case "warehouse":
        return "bg-green-100 text-green-800";
      case "sold":
        return "bg-gray-100 text-gray-800";
      case "loan":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Оплачен";
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Заголовок и баланс */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
        <div className="flex items-center space-x-4">
          <div className="bg-green-100 px-4 py-2 rounded-lg">
            <span className="text-sm text-green-700">Доступно: </span>
            <span className="font-bold text-green-800">
              ${currentBalance.toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            Новый заказ
          </button>
        </div>
      </div>

      {/* Список заказов */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Все заказы</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header sticky-first-col z-20 bg-gray-50">
                  Поставщик
                </th>
                <th className="table-header">Номер заказа</th>
                <th className="table-header">Товар</th>
                <th className="table-header">Количество</th>
                <th className="table-header">Стоимость</th>
                <th className="table-header">Статус</th>
                <th className="table-header">Дата</th>
                <th className="table-header">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td
                    className="table-cell sticky-first-col z-10 bg-white font-medium cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    {order.supplier_name}
                  </td>
                  <td
                    className="table-cell font-medium cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    {order.order_number}
                  </td>
                  <td
                    className="table-cell cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    {order.item_name}
                  </td>
                  <td
                    className="table-cell cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    {order.value} {order.measurement}
                  </td>
                  <td
                    className="table-cell cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    ${order.total_price?.toFixed(2)}
                  </td>
                  <td
                    className="table-cell cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td
                    className="table-cell cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    {new Date(order.date).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOrder(order);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Просмотр операций"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Форма добавления заказа */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Новый заказ</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Номер заказа */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="input-field w-full"
                      placeholder="Введите номер заказа"
                    />
                  </div>

                  {/* Поставщик */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Поставщик *
                    </label>
                    <select
                      required
                      value={formData.supplier_id}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="input-field w-full"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Товар *
                    </label>
                    <select
                      required
                      value={formData.item_id}
                      onChange={(e) =>
                        setFormData({ ...formData, item_id: e.target.value })
                      }
                      className="input-field w-full"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="input-field w-full"
                    />
                  </div>

                  {/* Описание */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="input-field w-full"
                      placeholder="Введите описание заказа"
                    />
                  </div>

                  {/* Измерение */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="input-field w-full"
                      placeholder="m3"
                    />
                  </div>

                  {/* Количество */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="input-field w-full"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Цена за единицу */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="input-field w-full"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Общая стоимость */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="input-field w-full"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Работа с долгами поставщика */}
                {selectedSupplierDebts.length > 0 && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-800 mb-3">
                      Долги поставщика
                    </h4>

                    {selectedSupplierDebts.map((debt, idx) => (
                      <div key={idx} className="mb-3 p-3 bg-amber-100 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-amber-900">
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
                            className={`px-3 py-1 rounded text-sm ${
                              supplierItems.find(
                                (item) =>
                                  item.name === debt.item_name &&
                                  item.id === parseInt(formData.item_id)
                              )
                                ? "bg-amber-600 text-white hover:bg-amber-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
                      <div className="mt-4 p-3 bg-white border border-amber-300 rounded">
                        <h5 className="font-medium text-gray-900 mb-3">
                          Работа с долгом: {debtHandling.item_name}
                        </h5>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Тип операции
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center">
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
                                  className="mr-2"
                                />
                                Вычесть из стоимости заказа
                              </label>
                              <label className="flex items-center">
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
                                  className="mr-2"
                                />
                                Добавить к объему заказа
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Максимум: {debtHandling.max_amount.toFixed(2)}{" "}
                              {formData.measurement}
                            </p>
                          </div>

                          {debtHandling.type === "subtract" && (
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-sm text-green-800">
                                Итоговая стоимость: $
                                {(
                                  formData.total_price -
                                  debtHandling.amount *
                                    (formData.price_per_unit || 0)
                                ).toFixed(2)}
                                <span className="text-green-600 ml-2">
                                  (экономия: $
                                  {(
                                    debtHandling.amount *
                                    (formData.price_per_unit || 0)
                                  ).toFixed(2)}
                                  )
                                </span>
                              </p>
                            </div>
                          )}

                          {debtHandling.type === "add_to_order" && (
                            <div className="bg-blue-50 p-2 rounded">
                              <p className="text-sm text-blue-800">
                                Новый объем заказа:{" "}
                                {(formData.value + debtHandling.amount).toFixed(
                                  2
                                )}{" "}
                                {formData.measurement}
                                <span className="text-blue-600 ml-2">
                                  (+{debtHandling.amount.toFixed(2)}{" "}
                                  {formData.measurement} от долга)
                                </span>
                              </p>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDebtHandling((prev) => ({
                                  ...prev,
                                  enabled: false,
                                }))
                              }
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Чекбокс для множественных контейнеров */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="multipleContainers"
                      checked={formData.multipleContainers}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          multipleContainers: e.target.checked,
                          containers: e.target.checked
                            ? [{ container: 1, value: formData.value }]
                            : [],
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="multipleContainers"
                      className="ml-2 text-sm text-gray-900"
                    >
                      Загружается в несколько контейнеров
                    </label>
                  </div>

                  {/* Чекбокс для загрузки от компании */}
                  {formData.multipleContainers && (
                    <div className="flex items-center ml-6">
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
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="companyLoading"
                        className="ml-2 text-sm text-gray-900"
                      >
                        Загружается от компании (займ)
                      </label>
                    </div>
                  )}
                </div>

                {/* Контейнеры */}
                {formData.multipleContainers && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Количество контейнеров
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.containerCount}
                        onChange={(e) =>
                          handleContainerCountChange(
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="input-field w-32"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.containers.map((container, index) => (
                        <div
                          key={container.container}
                          className={`border p-3 rounded ${
                            formData.isCompanyLoading &&
                            formData.selectedContainersForPayment.includes(
                              container.container
                            )
                              ? "border-blue-500 bg-blue-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">
                              Контейнер {container.container}
                            </h4>
                            {formData.isCompanyLoading && (
                              <input
                                type="checkbox"
                                checked={formData.selectedContainersForPayment.includes(
                                  container.container
                                )}
                                onChange={(e) => {
                                  const selected =
                                    formData.selectedContainersForPayment;
                                  const newSelected = e.target.checked
                                    ? [...selected, container.container]
                                    : selected.filter(
                                        (c) => c !== container.container
                                      );
                                  setFormData({
                                    ...formData,
                                    selectedContainersForPayment: newSelected,
                                  });
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                title="Оплатить этот контейнер"
                              />
                            )}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={formData.value}
                            value={container.value}
                            onChange={(e) =>
                              handleContainerValueChange(
                                index,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-field w-full"
                            placeholder={`Количество (${formData.measurement})`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        Общий объем: {formData.value} {formData.measurement}
                      </div>
                      <div>
                        Загружено в контейнеры:{" "}
                        {getTotalLoadedValue().toFixed(2)}{" "}
                        {formData.measurement}
                      </div>
                      {getUnloadedValue() > 0 && (
                        <div className="text-orange-600">
                          Остаток у поставщика: {getUnloadedValue().toFixed(2)}{" "}
                          {formData.measurement}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Кнопки */}
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn btn-primary">
                    Создать заказ
                  </button>
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
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Диалог оплаты транспортировки */}
      {showTransportDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Оплата транспортировки</h3>
              <p className="text-sm text-gray-600 mb-4">
                Заказ: {selectedOrder.order_number}
                <br />
                Общий объем: {selectedOrder.value} {selectedOrder.measurement}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="input-field w-full"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите контейнеры для транспортировки:
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {getOrderContainers(selectedOrder).map(
                      (container: ContainerLoad) => (
                        <label
                          key={container.container}
                          className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={transportForm.selectedContainers.includes(
                              container.container
                            )}
                            onChange={() =>
                              toggleContainerSelection(container.container)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              Контейнер {container.container}
                            </div>
                            <div className="text-sm text-gray-600">
                              {container.value.toFixed(2)}{" "}
                              {selectedOrder.measurement}
                            </div>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                  {transportForm.selectedContainers.length > 0 && (
                    <div className="mt-2 text-sm text-blue-600">
                      Выбрано контейнеров:{" "}
                      {transportForm.selectedContainers.length}
                      <br />
                      Общий объем:{" "}
                      {getOrderContainers(selectedOrder)
                        .filter((c: ContainerLoad) =>
                          transportForm.selectedContainers.includes(c.container)
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
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handlePayTransportation}
                  disabled={transportForm.selectedContainers.length === 0}
                  className="btn btn-primary disabled:opacity-50"
                >
                  Оплатить
                </button>
                <button
                  onClick={() => {
                    setShowTransportDialog(false);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог оплаты таможенного сбора */}
      {showCustomerFeeDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">
                Оплата таможенного сбора
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Заказ: {selectedOrder.order_number}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        value: parseFloat(e.target.value) || selectedOrder.value,
                      })
                    }
                    className="input-field w-full"
                    placeholder={selectedOrder.value.toString()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="input-field w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handlePayCustomerFee}
                  className="btn btn-primary"
                >
                  Оплатить
                </button>
                <button
                  onClick={() => {
                    setShowCustomerFeeDialog(false);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог продажи */}
      {showSellDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Продажа товара</h3>
              <p className="text-sm text-gray-600 mb-4">
                Заказ: {selectedOrder.order_number}
                <br />
                Доступно: {selectedOrder.value} {selectedOrder.measurement}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="input-field w-full"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Цена ($) *
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
                    className="input-field w-full"
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
                    className="input-field w-full"
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
                    className="input-field w-full"
                    placeholder="Описание продажи"
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
                    className="input-field w-full"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="linkToManager"
                      className="ml-2 text-sm text-gray-900"
                    >
                      Связать продажу с менеджером (автоматически увеличить его
                      займ)
                    </label>
                  </div>

                  {sellForm.link_to_manager && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="input-field w-full"
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
              <div className="flex space-x-3 mt-6">
                <button onClick={handleSellOrder} className="btn btn-primary">
                  Продать
                </button>
                <button
                  onClick={() => {
                    setShowSellDialog(false);
                    setSelectedOrder(null);
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог оплаты займа */}
      {showLoanPaymentDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Оплата займа</h3>
              <p className="text-sm text-gray-600 mb-4">
                Заказ: {selectedOrder.order_number}
                <br />
                Общий объем: {selectedOrder.value} {selectedOrder.measurement}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Выберите контейнеры для оплаты займа:
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {getOrderContainers(selectedOrder).map(
                      (container: OrderContainer, index: number) => (
                        <div
                          key={index}
                          className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
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
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              Контейнер {container.container}
                            </div>
                            <div className="text-sm text-gray-600">
                              {container.value.toFixed(2)}{" "}
                              {selectedOrder.measurement}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  {loanPaymentForm.containers.length > 0 && (
                    <div className="mt-2 text-sm text-blue-600">
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
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          Контейнер {container.container}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeLoanContainer(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="input-field w-full"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="input-field w-full"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
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
                            className="input-field w-full"
                            placeholder="Описание оплаты"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={addLoanContainer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Добавить контейнер
                  </button>
                  <button
                    type="button"
                    onClick={handleLoanPayment}
                    disabled={
                      loanPaymentForm.containers.length === 0 ||
                      loanPaymentForm.containers.some(
                        (c) => c.value === 0 || c.cost === 0
                      )
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Оплатить займ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLoanPaymentDialog(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра операций заказа */}
      {showOrderDetailsDialog && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  История операций заказа {selectedOrder.order_number}
                </h3>
                <button
                  onClick={() => setShowOrderDetailsDialog(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Основная информация о заказе */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Поставщик:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.supplier_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Товар:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.item_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Количество:
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.value} {selectedOrder.measurement}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Текущая стоимость:
                    </span>
                    <p className="text-sm font-bold text-green-600">
                      ${selectedOrder.total_price?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* История операций */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  История операций
                </h4>
                {orderOperations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Операций не найдено</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderOperations.map((operation, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">
                                {getOperationIcon(operation.action)}
                              </span>
                              <span className="font-medium text-gray-900">
                                {getOperationTitle(operation.action)}
                              </span>
                              {operation.amount && (
                                <span className="text-sm font-bold text-blue-600">
                                  ${operation.amount.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {operation.details}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(operation.created_at).toLocaleDateString(
                              "ru-RU"
                            )}{" "}
                            {new Date(operation.created_at).toLocaleTimeString(
                              "ru-RU"
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowOrderDetailsDialog(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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
  function getOperationIcon(action: string) {
    switch (action) {
      case "заказ_создан":
        return "📦";
      case "оплата_транспорта":
        return "🚛";
      case "оплата_таможни":
        return "🚢";
      case "оплата_займа":
        return "💰";
      case "продажа":
        return "💵";
      case "продажа_менеджера":
        return "🛒";
      case "увеличение_цены_заказа":
        return "📈";
      case "создание_расхода":
        return "📉";
      default:
        return "📝";
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
