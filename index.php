<?php
require_once __DIR__ . '/init.php';

// Требуем авторизацию
$session = requireAuth();

$pageTitle = 'Дашборд - DrevMaster';
$user = getCurrentUser();
?>

<?php include 'includes/header.php'; ?>
<?php include 'includes/nav.php'; ?>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" x-data="dashboard()">
    <!-- Заголовок -->
    <div class="mb-8 sm:mb-12 text-center sm:text-left">
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Добро пожаловать в 
            <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DrevMaster
            </span>
        </h1>
        <p class="text-base sm:text-lg text-gray-600 max-w-2xl">
            Система управления деревообрабатывающим бизнесом
        </p>
    </div>

    <!-- Загрузка -->
    <div x-show="loading" class="flex justify-center items-center py-12">
        <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">Загрузка данных...</p>
        </div>
    </div>

    <!-- Основной контент -->
    <div x-show="!loading" class="space-y-8">
        <!-- Статистические карточки -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div class="card bg-blue-50 border-blue-200 animate-slide-in-up" style="animation-delay: 0ms;">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-blue-700 mb-1">Всего заказов</p>
                        <p class="text-2xl sm:text-3xl font-bold text-blue-900" x-text="stats.totalOrders"></p>
                    </div>
                    <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
                        📦
                    </div>
                </div>
            </div>

            <div class="card bg-yellow-50 border-yellow-200 animate-slide-in-up" style="animation-delay: 100ms;">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-yellow-700 mb-1">В ожидании</p>
                        <p class="text-2xl sm:text-3xl font-bold text-yellow-900" x-text="stats.pendingOrders"></p>
                    </div>
                    <div class="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center text-2xl">
                        ⏳
                    </div>
                </div>
            </div>

            <div class="card bg-green-50 border-green-200 animate-slide-in-up" style="animation-delay: 200ms;">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-green-700 mb-1">Баланс</p>
                        <p class="text-2xl sm:text-3xl font-bold text-green-900" x-text="'$' + stats.totalBalance.toLocaleString()"></p>
                    </div>
                    <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl">
                        💰
                    </div>
                </div>
            </div>

            <div class="card bg-purple-50 border-purple-200 animate-slide-in-up" style="animation-delay: 300ms;">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-purple-700 mb-1">Поставщики</p>
                        <p class="text-2xl sm:text-3xl font-bold text-purple-900" x-text="stats.suppliersCount"></p>
                    </div>
                    <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
                        🏭
                    </div>
                </div>
            </div>
        </div>

        <!-- Быстрые действия -->
        <div class="mb-8 sm:mb-12">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center sm:text-left">
                Быстрые действия
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <a href="/orders.php" class="quick-action-card bg-blue-50 hover:bg-blue-100 border-blue-200" style="animation-delay: 400ms;">
                    <div class="text-center">
                        <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto">
                            📦
                        </div>
                        <h3 class="text-sm sm:text-lg font-semibold text-gray-900 mb-1">Новый заказ</h3>
                        <p class="text-xs sm:text-sm text-gray-600">Создать новый заказ</p>
                    </div>
                </a>

                <a href="/partners.php" class="quick-action-card bg-green-50 hover:bg-green-100 border-green-200" style="animation-delay: 500ms;">
                    <div class="text-center">
                        <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto">
                            🤝
                        </div>
                        <h3 class="text-sm sm:text-lg font-semibold text-gray-900 mb-1">Добавить партнера</h3>
                        <p class="text-xs sm:text-sm text-gray-600">Зарегистрировать нового партнера</p>
                    </div>
                </a>

                <a href="/cash.php" class="quick-action-card bg-yellow-50 hover:bg-yellow-100 border-yellow-200" style="animation-delay: 600ms;">
                    <div class="text-center">
                        <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto">
                            💰
                        </div>
                        <h3 class="text-sm sm:text-lg font-semibold text-gray-900 mb-1">Операции с кассой</h3>
                        <p class="text-xs sm:text-sm text-gray-600">Управление финансами</p>
                    </div>
                </a>

                <a href="/suppliers.php" class="quick-action-card bg-purple-50 hover:bg-purple-100 border-purple-200" style="animation-delay: 700ms;">
                    <div class="text-center">
                        <div class="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl mb-3 mx-auto">
                            🏭
                        </div>
                        <h3 class="text-sm sm:text-lg font-semibold text-gray-900 mb-1">Поставщики</h3>
                        <p class="text-xs sm:text-sm text-gray-600">Управление поставщиками</p>
                    </div>
                </a>
            </div>
        </div>

        <!-- Последние активности -->
        <div class="card animate-slide-in-up" style="animation-delay: 800ms;">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-900">Последние активности</h2>
                <a href="/history.php" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Посмотреть все →
                </a>
            </div>

            <div x-show="recentActivities.length === 0" class="text-center py-8 text-gray-500">
                <p>Пока нет активности</p>
            </div>

            <div x-show="recentActivities.length > 0" class="space-y-4">
                <template x-for="(activity, index) in recentActivities" :key="activity.id">
                    <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg mr-4">
                            <span x-text="getActivityIcon(activity.action)"></span>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-900" x-text="activity.details"></p>
                            <p class="text-xs text-gray-500">
                                <span x-text="activity.user_name || 'Система'"></span> • 
                                <span x-text="formatDate(activity.created_at)"></span>
                            </p>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</div>

<style>
    .quick-action-card {
        @apply rounded-xl p-4 sm:p-6 border backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-2 hover:shadow-lg group animate-slide-in-up;
    }
</style>

<script>
    function dashboard() {
        return {
            loading: true,
            stats: {
                totalOrders: 0,
                pendingOrders: 0,
                totalBalance: 0,
                suppliersCount: 0
            },
            recentActivities: [],

            async init() {
                await this.fetchStats();
                await this.fetchRecentActivities();
                this.loading = false;
            },

            async fetchStats() {
                try {
                    const response = await axios.get('/api/dashboard/stats.php');
                    this.stats = response.data;
                } catch (error) {
                    console.error('Ошибка загрузки статистики:', error);
                }
            },

            async fetchRecentActivities() {
                try {
                    const response = await axios.get('/api/activity-logs.php?limit=5');
                    this.recentActivities = Array.isArray(response.data) ? response.data.slice(0, 3) : [];
                } catch (error) {
                    console.error('Ошибка загрузки активности:', error);
                    this.recentActivities = [];
                }
            },

            getActivityIcon(action) {
                const icons = {
                    'создан': '📦',
                    'заказ_создан': '📦',
                    'займ_взят': '💰',
                    'займ_погашен': '💰',
                    'оплата_транспорта': '🚛',
                    'оплата_пошлины': '🚢',
                    'оплата_таможни': '🚢',
                    'продажа': '💵',
                    'обновлен': '✏️',
                    'удален': '🗑️',
                    'вход': '🔐',
                    'выход': '🔐'
                };
                return icons[action] || '📝';
            }
        }
    }
</script>

<?php include 'includes/footer.php'; ?> 