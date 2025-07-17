<?php
$user = getCurrentUser();
if (!$user) {
    header('Location: /login.php');
    exit;
}

function isAdmin() {
    return hasRole('admin');
}

function isManager() {
    return hasRole('manager');
}
?>

<nav class="bg-white shadow-lg border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <!-- Левая часть навигации -->
            <div class="flex items-center space-x-8">
                <!-- Логотип -->
                <div class="flex-shrink-0 flex items-center">
                    <h1 class="text-xl font-bold text-gray-900">
                        <span class="text-blue-600">Drev</span>Master
                    </h1>
                </div>
                
                <!-- Основная навигация -->
                <div class="hidden md:flex space-x-8">
                    <!-- Показываем разные меню в зависимости от роли -->
                    <?php if (isAdmin()): ?>
                        <a href="/index.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Дашборд
                        </a>
                        <a href="/orders.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Заказы
                        </a>
                        <a href="/cash.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Касса
                        </a>
                        <div class="relative" x-data="{ open: false }">
                            <button @click="open = !open" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150 flex items-center">
                                Управление
                                <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <div x-show="open" @click.away="open = false" x-transition class="absolute z-50 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                                <a href="/suppliers.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Поставщики</a>
                                <a href="/partners.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Партнеры</a>
                                <a href="/managers.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Менеджеры</a>
                                <a href="/users.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Пользователи</a>
                            </div>
                        </div>
                    <?php elseif (isManager()): ?>
                        <a href="/manager/dashboard.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Мой дашборд
                        </a>
                        <a href="/manager/tasks.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Задачи
                        </a>
                        <a href="/manager/reports.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Отчеты
                        </a>
                    <?php else: ?>
                        <a href="/partner/dashboard.php" class="nav-link text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-150">
                            Мой кабинет
                        </a>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Правая часть навигации -->
            <div class="flex items-center space-x-4">
                <!-- Уведомления -->
                <button class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition duration-150">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-4.5-4.5 4.5-4.5h-5m-6 7l-5-5 5-5v10z"></path>
                    </svg>
                </button>
                
                <!-- Профиль пользователя -->
                <div class="relative" x-data="{ open: false }">
                    <button @click="open = !open" class="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 p-2 hover:bg-gray-100 transition duration-150">
                        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                            <span class="text-sm font-medium text-white"><?= substr($user['name'] ?? $user['username'], 0, 1) ?></span>
                        </div>
                        <span class="hidden sm:block text-gray-700"><?= htmlspecialchars($user['name'] ?? $user['username']) ?></span>
                        <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    
                    <div x-show="open" @click.away="open = false" x-transition class="absolute right-0 z-50 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                        <div class="px-4 py-2 text-sm text-gray-500 border-b">
                            Роль: 
                            <?php if (isAdmin()): ?>
                                <span class="font-medium text-green-600">Администратор</span>
                            <?php elseif (isManager()): ?>
                                <span class="font-medium text-blue-600">Менеджер</span>
                            <?php else: ?>
                                <span class="font-medium text-purple-600">Партнер</span>
                            <?php endif; ?>
                        </div>
                        <a href="/profile.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Профиль</a>
                        <a href="/settings.php" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Настройки</a>
                        <div class="border-t">
                            <button onclick="logout()" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                Выйти
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Мобильная навигация -->
        <div class="md:hidden" x-data="{ open: false }">
            <button @click="open = !open" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path x-show="!open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    <path x-show="open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
            
            <div x-show="open" x-transition class="md:hidden">
                <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t">
                    <!-- Мобильное меню зависящее от роли -->
                    <?php if (isAdmin()): ?>
                        <a href="/index.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Дашборд</a>
                        <a href="/orders.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Заказы</a>
                        <a href="/cash.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Касса</a>
                        <a href="/suppliers.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Поставщики</a>
                        <a href="/partners.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Партнеры</a>
                        <a href="/managers.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Менеджеры</a>
                        <a href="/users.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Пользователи</a>
                    <?php elseif (isManager()): ?>
                        <a href="/manager/dashboard.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Мой дашборд</a>
                        <a href="/manager/tasks.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Задачи</a>
                        <a href="/manager/reports.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Отчеты</a>
                    <?php else: ?>
                        <a href="/partner/dashboard.php" class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md">Мой кабинет</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</nav>

<script>
    async function logout() {
        try {
            await axios.delete('/api/auth/login.php');
            window.location.href = '/login.php';
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }
</script> 