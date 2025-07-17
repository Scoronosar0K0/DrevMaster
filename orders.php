<?php
require_once __DIR__ . '/init.php';

// Требуем авторизацию
$session = requireAuth();

$pageTitle = 'Заказы - DrevMaster';
$user = getCurrentUser();
?>

<?php include 'includes/header.php'; ?>
<?php include 'includes/nav.php'; ?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" x-data="ordersPage()">
    <!-- Заголовок и кнопки действий -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="mb-4 sm:mb-0">
            <h1 class="text-3xl font-bold text-gray-900">📦 Заказы</h1>
            <p class="mt-1 text-sm text-gray-500">Управление заказами древесины</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
            <button @click="openCreateModal()" class="btn btn-primary">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Новый заказ
            </button>
            
            <button @click="loadOrders()" class="btn btn-secondary">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Обновить
            </button>
        </div>
    </div>

    <!-- Фильтры и поиск -->
    <div class="mb-6 bg-white rounded-lg shadow p-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Поиск</label>
                <input x-model="search" @input="filterOrders()" 
                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                       placeholder="Поиск по товару, поставщику...">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                <select x-model="statusFilter" @change="filterOrders()"
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="">Все статусы</option>
                    <option value="pending">Ожидание</option>
                    <option value="in_progress">В процессе</option>
                    <option value="delivered">Доставлен</option>
                    <option value="warehouse">На складе</option>
                    <option value="sold">Продан</option>
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Поставщик</label>
                <select x-model="supplierFilter" @change="filterOrders()"
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="">Все поставщики</option>
                    <template x-for="supplier in suppliers" :key="supplier.id">
                        <option :value="supplier.id" x-text="supplier.name"></option>
                    </template>
                </select>
            </div>
            
            <div class="flex items-end">
                <button @click="resetFilters()" class="btn btn-secondary w-full">
                    Сбросить фильтры
                </button>
            </div>
        </div>
    </div>

    <!-- Таблица заказов -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Товар
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Поставщик
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Количество
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Стоимость
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Статус
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Дата
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Действия
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <template x-for="order in filteredOrders" :key="order.id">
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900" x-text="order.product_name"></div>
                                <div class="text-sm text-gray-500" x-text="order.description"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900" x-text="order.supplier_name"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900" x-text="order.quantity + ' ' + (order.unit || 'шт')"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900" x-text="formatCurrency(order.total_cost)"></div>
                                <div class="text-sm text-gray-500" x-show="order.profit" x-text="'Прибыль: ' + formatCurrency(order.profit)"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                      :class="getStatusBadgeClass(order.status)"
                                      x-text="getStatusText(order.status)">
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div x-text="formatDate(order.created_at)"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex justify-end space-x-2">
                                    <button @click="editOrder(order)" class="text-blue-600 hover:text-blue-900">
                                        Изменить
                                    </button>
                                    <button @click="viewOrder(order)" class="text-green-600 hover:text-green-900">
                                        Просмотр
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Модальное окно создания/редактирования заказа -->
    <div x-show="showModal" x-cloak class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form @submit.prevent="saveOrder()">
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4" x-text="editingOrder ? 'Редактировать заказ' : 'Новый заказ'"></h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Поставщик</label>
                                <select x-model="form.supplier_id" required
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <option value="">Выберите поставщика</option>
                                    <template x-for="supplier in suppliers" :key="supplier.id">
                                        <option :value="supplier.id" x-text="supplier.name"></option>
                                    </template>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Название товара</label>
                                <input x-model="form.product_name" type="text" required
                                       class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Описание</label>
                                <textarea x-model="form.description" rows="3"
                                          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Количество</label>
                                    <input x-model="form.quantity" type="number" step="0.01" required
                                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Единица измерения</label>
                                    <input x-model="form.unit" type="text" placeholder="м³, кг, шт"
                                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Общая стоимость</label>
                                <input x-model="form.total_cost" type="number" step="0.01" required
                                       class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Статус</label>
                                <select x-model="form.status"
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <option value="pending">Ожидание</option>
                                    <option value="in_progress">В процессе</option>
                                    <option value="delivered">Доставлен</option>
                                    <option value="warehouse">На складе</option>
                                    <option value="sold">Продан</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="submit" class="btn btn-primary sm:ml-3 sm:w-auto w-full">
                            <span x-text="editingOrder ? 'Сохранить' : 'Создать'"></span>
                        </button>
                        <button @click="closeModal()" type="button" class="btn btn-secondary sm:w-auto w-full mt-3 sm:mt-0">
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
function ordersPage() {
    return {
        orders: [],
        filteredOrders: [],
        suppliers: [],
        showModal: false,
        editingOrder: null,
        search: '',
        statusFilter: '',
        supplierFilter: '',
        
        form: {
            supplier_id: '',
            product_name: '',
            description: '',
            quantity: '',
            unit: '',
            total_cost: '',
            status: 'pending'
        },
        
        async init() {
            await this.loadOrders();
            await this.loadSuppliers();
        },
        
        async loadOrders() {
            try {
                const response = await axios.get('/api/orders.php');
                this.orders = response.data.data;
                this.filterOrders();
            } catch (error) {
                console.error('Ошибка загрузки заказов:', error);
                showNotification('Ошибка загрузки заказов', 'error');
            }
        },
        
        async loadSuppliers() {
            try {
                const response = await axios.get('/api/suppliers.php');
                this.suppliers = response.data.data;
            } catch (error) {
                console.error('Ошибка загрузки поставщиков:', error);
            }
        },
        
        filterOrders() {
            let filtered = this.orders;
            
            if (this.search) {
                const searchLower = this.search.toLowerCase();
                filtered = filtered.filter(order => 
                    order.product_name.toLowerCase().includes(searchLower) ||
                    order.supplier_name.toLowerCase().includes(searchLower) ||
                    (order.description && order.description.toLowerCase().includes(searchLower))
                );
            }
            
            if (this.statusFilter) {
                filtered = filtered.filter(order => order.status === this.statusFilter);
            }
            
            if (this.supplierFilter) {
                filtered = filtered.filter(order => order.supplier_id == this.supplierFilter);
            }
            
            this.filteredOrders = filtered;
        },
        
        resetFilters() {
            this.search = '';
            this.statusFilter = '';
            this.supplierFilter = '';
            this.filterOrders();
        },
        
        openCreateModal() {
            this.editingOrder = null;
            this.form = {
                supplier_id: '',
                product_name: '',
                description: '',
                quantity: '',
                unit: '',
                total_cost: '',
                status: 'pending'
            };
            this.showModal = true;
        },
        
        editOrder(order) {
            this.editingOrder = order;
            this.form = { ...order };
            this.showModal = true;
        },
        
        viewOrder(order) {
            // TODO: Implement order details view
            alert('Просмотр заказа: ' + order.product_name);
        },
        
        closeModal() {
            this.showModal = false;
            this.editingOrder = null;
        },
        
        async saveOrder() {
            try {
                const url = this.editingOrder ? 
                    `/api/orders.php?id=${this.editingOrder.id}` : 
                    '/api/orders.php';
                const method = this.editingOrder ? 'put' : 'post';
                
                await axios[method](url, this.form);
                
                showNotification(
                    this.editingOrder ? 'Заказ обновлен' : 'Заказ создан', 
                    'success'
                );
                
                this.closeModal();
                await this.loadOrders();
            } catch (error) {
                console.error('Ошибка сохранения заказа:', error);
                showNotification('Ошибка сохранения заказа', 'error');
            }
        },
        
        getStatusText(status) {
            const statusMap = {
                'pending': 'Ожидание',
                'in_progress': 'В процессе',
                'delivered': 'Доставлен',
                'warehouse': 'На складе',
                'sold': 'Продан'
            };
            return statusMap[status] || status;
        },
        
        getStatusBadgeClass(status) {
            const classMap = {
                'pending': 'bg-yellow-100 text-yellow-800',
                'in_progress': 'bg-blue-100 text-blue-800',
                'delivered': 'bg-green-100 text-green-800',
                'warehouse': 'bg-purple-100 text-purple-800',
                'sold': 'bg-gray-100 text-gray-800'
            };
            return classMap[status] || 'bg-gray-100 text-gray-800';
        }
    }
}
</script>

<?php include 'includes/footer.php'; ?> 