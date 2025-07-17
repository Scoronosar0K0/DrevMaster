<?php
if (!Auth::check()) {
    return;
}

$user = Auth::user();
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
?>

<nav class="bg-white shadow-lg border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
            <!-- Логотип -->
            <div class="flex items-center">
                <a href="/index.php" class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <span class="text-white text-xl font-bold">🌳</span>
                    </div>
                    <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        DrevMaster
                    </span>
                </a>
            </div>
            
            <!-- Основная навигация -->
            <div class="hidden md:flex items-center space-x-8">
                <?php if (Auth::isAdmin()): ?>
                    <a href="/index.php" class="nav-link <?php echo $currentPage === 'index' ? 'active' : ''; ?>">
                        📊 Дашборд
                    </a>
                    <a href="/orders.php" class="nav-link <?php echo $currentPage === 'orders' ? 'active' : ''; ?>">
                        📦 Заказы
                    </a>
                    <a href="/cash.php" class="nav-link <?php echo $currentPage === 'cash' ? 'active' : ''; ?>">
                        💰 Касса
                    </a>
                    <a href="/partners.php" class="nav-link <?php echo $currentPage === 'partners' ? 'active' : ''; ?>">
                        🤝 Партнеры
                    </a>
                    <a href="/suppliers.php" class="nav-link <?php echo $currentPage === 'suppliers' ? 'active' : ''; ?>">
                        🏭 Поставщики
                    </a>
                    <a href="/managers.php" class="nav-link <?php echo $currentPage === 'managers' ? 'active' : ''; ?>">
                        👥 Менеджеры
                    </a>
                    <a href="/analytics.php" class="nav-link <?php echo $currentPage === 'analytics' ? 'active' : ''; ?>">
                        📈 Аналитика
                    </a>
                    <a href="/history.php" class="nav-link <?php echo $currentPage === 'history' ? 'active' : ''; ?>">
                        📈 История
                    </a>
                    <a href="/settings.php" class="nav-link <?php echo $currentPage === 'settings' ? 'active' : ''; ?>">
                        ⚙️ Настройки
                    </a>
                <?php elseif (Auth::isManager()): ?>
                    <a href="/manager/dashboard.php" class="nav-link <?php echo $currentPage === 'dashboard' ? 'active' : ''; ?>">
                        📊 Панель
                    </a>
                    <a href="/manager/cash.php" class="nav-link <?php echo $currentPage === 'cash' ? 'active' : ''; ?>">
                        💰 Мои финансы
                    </a>
                    <a href="/manager/warehouse.php" class="nav-link <?php echo $currentPage === 'warehouse' ? 'active' : ''; ?>">
                        🏪 Мой склад
                    </a>
                    <a href="/manager/transfers.php" class="nav-link <?php echo $currentPage === 'transfers' ? 'active' : ''; ?>">
                        💸 Переводы
                    </a>
                <?php endif; ?>
            </div>
            
            <!-- Пользователь и выход -->
            <div class="flex items-center space-x-4">
                <div class="text-sm text-gray-600">
                    <span class="font-medium"><?php echo htmlspecialchars($user['name']); ?></span>
                    <span class="text-xs text-gray-400 ml-2"><?php echo $user['role']; ?></span>
                </div>
                
                <button onclick="logout()" class="btn bg-red-100 hover:bg-red-200 text-red-700 text-sm">
                    🚪 Выйти
                </button>
            </div>
            
            <!-- Мобильное меню (кнопка) -->
            <div class="md:hidden">
                <button onclick="toggleMobileMenu()" class="text-gray-500 hover:text-gray-700">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </div>
        
        <!-- Мобильное меню -->
        <div id="mobileMenu" class="md:hidden hidden pb-4">
            <?php if (Auth::isAdmin()): ?>
                <a href="/index.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">📊 Дашборд</a>
                <a href="/orders.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">📦 Заказы</a>
                <a href="/cash.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">💰 Касса</a>
                <a href="/partners.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">🤝 Партнеры</a>
                <a href="/suppliers.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">🏭 Поставщики</a>
                <a href="/managers.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">👥 Менеджеры</a>
                <a href="/analytics.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">📈 Аналитика</a>
                <a href="/history.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">📈 История</a>
                <a href="/settings.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">⚙️ Настройки</a>
            <?php elseif (Auth::isManager()): ?>
                <a href="/manager/dashboard.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">📊 Панель</a>
                <a href="/manager/cash.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">💰 Мои финансы</a>
                <a href="/manager/warehouse.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">🏪 Мой склад</a>
                <a href="/manager/transfers.php" class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100">💸 Переводы</a>
            <?php endif; ?>
        </div>
    </div>
</nav>

<style>
    .nav-link {
        @apply text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200;
    }
    
    .nav-link.active {
        @apply text-blue-600 bg-blue-50;
    }
</style>

<script>
    function toggleMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('hidden');
    }
    
    async function logout() {
        try {
            await axios.delete('/api/auth/login.php');
            showNotification('Вы успешно вышли из системы');
            setTimeout(() => {
                window.location.href = '/login.php';
            }, 1000);
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }
</script> 