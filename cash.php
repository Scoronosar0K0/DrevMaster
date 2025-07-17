<?php
require_once __DIR__ . '/init.php';

// Требуем авторизацию
$session = requireAuth();

$pageTitle = 'Касса - DrevMaster';
$user = getCurrentUser();
?>

<?php include 'includes/header.php'; ?>
<?php include 'includes/nav.php'; ?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" x-data="cashPage()">
    <!-- Заголовок -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div class="mb-4 sm:mb-0">
            <h1 class="text-3xl font-bold text-gray-900">💰 Касса</h1>
            <p class="mt-1 text-sm text-gray-500">Управление финансами и денежными потоками</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
            <button @click="openAddModal('income')" class="btn btn-success">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Доход
            </button>
            
            <button @click="openAddModal('expense')" class="btn btn-danger">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path>
                </svg>
                Расход
            </button>
            
            <button @click="loadData()" class="btn btn-secondary">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Обновить
            </button>
        </div>
    </div>

    <!-- Карточки с балансом -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-gradient-to-r from-green-400 to-green-600 rounded-lg shadow p-6 text-white">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-green-100 truncate">Текущий баланс</dt>
                        <dd class="text-lg font-medium" x-text="formatCurrency(balance.current)">0 ₽</dd>
                    </dl>
                </div>
            </div>
        </div>
        
        <div class="bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg shadow p-6 text-white">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-blue-100 truncate">Доходы (месяц)</dt>
                        <dd class="text-lg font-medium" x-text="formatCurrency(balance.monthly_income)">0 ₽</dd>
                    </dl>
                </div>
            </div>
        </div>
        
        <div class="bg-gradient-to-r from-red-400 to-red-600 rounded-lg shadow p-6 text-white">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
                    </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-red-100 truncate">Расходы (месяц)</dt>
                        <dd class="text-lg font-medium" x-text="formatCurrency(Math.abs(balance.monthly_expenses))">0 ₽</dd>
                    </dl>
                </div>
            </div>
        </div>
        
        <div class="bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg shadow p-6 text-white">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                    <dl>
                        <dt class="text-sm font-medium text-purple-100 truncate">Операций (всего)</dt>
                        <dd class="text-lg font-medium" x-text="transactions.length">0</dd>
                    </dl>
                </div>
            </div>
        </div>
    </div>

    <!-- Фильтры -->
    <div class="mb-6 bg-white rounded-lg shadow p-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Поиск</label>
                <input x-model="search" @input="filterTransactions()" 
                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                       placeholder="Поиск по описанию...">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Тип операции</label>
                <select x-model="typeFilter" @change="filterTransactions()"
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="">Все операции</option>
                    <option value="income">Доходы</option>
                    <option value="expense">Расходы</option>
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Период</label>
                <select x-model="periodFilter" @change="filterTransactions()"
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    <option value="">Все время</option>
                    <option value="today">Сегодня</option>
                    <option value="week">Неделя</option>
                    <option value="month">Месяц</option>
                    <option value="year">Год</option>
                </select>
            </div>
            
            <div class="flex items-end">
                <button @click="resetFilters()" class="btn btn-secondary w-full">
                    Сбросить фильтры
                </button>
            </div>
        </div>
    </div>

    <!-- Таблица операций -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Дата и время
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Описание
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Тип
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Сумма
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Баланс после
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Автор
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <template x-for="transaction in filteredTransactions" :key="transaction.id">
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div x-text="formatDate(transaction.created_at)"></div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-sm font-medium text-gray-900" x-text="transaction.description"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                      :class="transaction.amount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                                      x-text="transaction.amount > 0 ? 'Доход' : 'Расход'">
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium"
                                     :class="transaction.amount > 0 ? 'text-green-600' : 'text-red-600'"
                                     x-text="formatCurrency(transaction.amount)">
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div x-text="formatCurrency(transaction.balance_after)"></div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div x-text="transaction.user_name || 'Система'"></div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Модальное окно добавления операции -->
    <div x-show="showModal" x-cloak class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form @submit.prevent="saveTransaction()">
                    <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                            <span x-show="transactionType === 'income'" class="text-green-600">💰 Добавить доход</span>
                            <span x-show="transactionType === 'expense'" class="text-red-600">💸 Добавить расход</span>
                        </h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Описание</label>
                                <input x-model="form.description" type="text" required
                                       class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                       placeholder="Опишите операцию...">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Сумма</label>
                                <input x-model="form.amount" type="number" step="0.01" required min="0"
                                       class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                       placeholder="0.00">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Категория</label>
                                <select x-model="form.category" 
                                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <template x-if="transactionType === 'income'">
                                        <div>
                                            <option value="sale">Продажа товара</option>
                                            <option value="service">Оказание услуг</option>
                                            <option value="loan_repayment">Возврат займа</option>
                                            <option value="other_income">Прочие доходы</option>
                                        </div>
                                    </template>
                                    
                                    <template x-if="transactionType === 'expense'">
                                        <div>
                                            <option value="purchase">Закупка товара</option>
                                            <option value="transport">Транспортные расходы</option>
                                            <option value="customs">Таможенные платежи</option>
                                            <option value="loan_payment">Выплата займа</option>
                                            <option value="salary">Зарплата</option>
                                            <option value="office">Офисные расходы</option>
                                            <option value="other_expense">Прочие расходы</option>
                                        </div>
                                    </template>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="submit" class="btn sm:ml-3 sm:w-auto w-full"
                                :class="transactionType === 'income' ? 'btn-success' : 'btn-danger'">
                            <span x-text="transactionType === 'income' ? 'Добавить доход' : 'Добавить расход'"></span>
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
function cashPage() {
    return {
        transactions: [],
        filteredTransactions: [],
        balance: {
            current: 0,
            monthly_income: 0,
            monthly_expenses: 0
        },
        showModal: false,
        transactionType: 'income',
        search: '',
        typeFilter: '',
        periodFilter: '',
        
        form: {
            description: '',
            amount: '',
            category: ''
        },
        
        async init() {
            await this.loadData();
        },
        
        async loadData() {
            await this.loadBalance();
            await this.loadTransactions();
        },
        
        async loadBalance() {
            try {
                const response = await axios.get('/api/cash/balance.php');
                this.balance = response.data.data;
            } catch (error) {
                console.error('Ошибка загрузки баланса:', error);
                showNotification('Ошибка загрузки баланса', 'error');
            }
        },
        
        async loadTransactions() {
            try {
                const response = await axios.get('/api/cash/transactions.php');
                this.transactions = response.data.data;
                this.filterTransactions();
            } catch (error) {
                console.error('Ошибка загрузки операций:', error);
                showNotification('Ошибка загрузки операций', 'error');
            }
        },
        
        filterTransactions() {
            let filtered = this.transactions;
            
            if (this.search) {
                const searchLower = this.search.toLowerCase();
                filtered = filtered.filter(transaction => 
                    transaction.description.toLowerCase().includes(searchLower)
                );
            }
            
            if (this.typeFilter) {
                if (this.typeFilter === 'income') {
                    filtered = filtered.filter(transaction => transaction.amount > 0);
                } else if (this.typeFilter === 'expense') {
                    filtered = filtered.filter(transaction => transaction.amount < 0);
                }
            }
            
            if (this.periodFilter) {
                const now = new Date();
                filtered = filtered.filter(transaction => {
                    const date = new Date(transaction.created_at);
                    
                    switch (this.periodFilter) {
                        case 'today':
                            return date.toDateString() === now.toDateString();
                        case 'week':
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            return date >= weekAgo;
                        case 'month':
                            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                        case 'year':
                            return date.getFullYear() === now.getFullYear();
                        default:
                            return true;
                    }
                });
            }
            
            this.filteredTransactions = filtered;
        },
        
        resetFilters() {
            this.search = '';
            this.typeFilter = '';
            this.periodFilter = '';
            this.filterTransactions();
        },
        
        openAddModal(type) {
            this.transactionType = type;
            this.form = {
                description: '',
                amount: '',
                category: type === 'income' ? 'sale' : 'purchase'
            };
            this.showModal = true;
        },
        
        closeModal() {
            this.showModal = false;
        },
        
        async saveTransaction() {
            try {
                const amount = this.transactionType === 'expense' ? 
                    -Math.abs(parseFloat(this.form.amount)) : 
                    Math.abs(parseFloat(this.form.amount));
                
                const data = {
                    ...this.form,
                    amount: amount
                };
                
                await axios.post('/api/cash/transactions.php', data);
                
                showNotification('Операция добавлена', 'success');
                this.closeModal();
                await this.loadData();
            } catch (error) {
                console.error('Ошибка добавления операции:', error);
                showNotification('Ошибка добавления операции', 'error');
            }
        }
    }
}
</script>

<?php include 'includes/footer.php'; ?> 