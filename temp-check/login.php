<?php
require_once __DIR__ . '/init.php';

// Если пользователь уже авторизован, перенаправляем на главную
if (Auth::check()) {
    header('Location: /index.php');
    exit;
}

$pageTitle = 'Вход в систему - DrevMaster';
?>

<?php include 'includes/header.php'; ?>

<div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
    <!-- Анимированный фон -->
    <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
        <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-indigo-400/20 to-blue-400/20 rounded-full animate-pulse" style="animation-delay: 1s;"></div>
    </div>

    <!-- Форма логина -->
    <div class="relative z-10 w-full max-w-md" x-data="loginForm()">
        <div class="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-105">
            <!-- Логотип и заголовок -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4 animate-bounce">
                    <span class="text-2xl text-white font-bold">🌳</span>
                </div>
                <h1 class="text-3xl font-bold text-gray-900 mb-2">DrevMaster</h1>
                <p class="text-gray-600">Система управления заказами древесины</p>
            </div>

            <!-- Форма -->
            <form @submit.prevent="login" class="space-y-6">
                <!-- Поле логина -->
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                        👤 Логин
                    </label>
                    <input
                        type="text"
                        id="username"
                        x-model="formData.username"
                        class="form-input"
                        placeholder="Введите логин"
                        required
                        :disabled="loading"
                    >
                </div>

                <!-- Поле пароля -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                        🔐 Пароль
                    </label>
                    <div class="relative">
                        <input
                            :type="showPassword ? 'text' : 'password'"
                            id="password"
                            x-model="formData.password"
                            class="form-input pr-12"
                            placeholder="Введите пароль"
                            required
                            :disabled="loading"
                        >
                        <button
                            type="button"
                            @click="showPassword = !showPassword"
                            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <span x-text="showPassword ? '👁️' : '👁️‍🗨️'"></span>
                        </button>
                    </div>
                </div>

                <!-- Запомнить меня -->
                <div class="flex items-center">
                    <input
                        type="checkbox"
                        id="rememberMe"
                        x-model="formData.rememberMe"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        :disabled="loading"
                    >
                    <label for="rememberMe" class="ml-2 block text-sm text-gray-700">
                        Запомнить меня
                    </label>
                </div>

                <!-- Кнопка входа -->
                <button
                    type="submit"
                    class="w-full btn btn-primary py-3 text-lg font-semibold relative"
                    :disabled="loading"
                    :class="loading ? 'opacity-50 cursor-not-allowed' : ''"
                >
                    <span x-show="!loading">🚀 Войти</span>
                    <span x-show="loading" class="flex items-center justify-center">
                        <div class="loading-spinner mr-2"></div>
                        Вход...
                    </span>
                </button>
            </form>

            <!-- Ошибка -->
            <div x-show="error" x-text="error" class="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm"></div>

            <!-- Информация для демо -->
            <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 class="text-sm font-semibold text-blue-800 mb-2">🔑 Демо доступ:</h4>
                <p class="text-xs text-blue-700">
                    Логин: <strong>admin</strong><br>
                    Пароль: <strong>admin</strong>
                </p>
            </div>
        </div>
    </div>
</div>

<script>
    function loginForm() {
        return {
            formData: {
                username: localStorage.getItem('drevmaster_username') || '',
                password: '',
                rememberMe: localStorage.getItem('drevmaster_remember') === 'true'
            },
            loading: false,
            error: '',
            showPassword: false,

            async login() {
                this.loading = true;
                this.error = '';

                try {
                    const response = await axios.post('/api/auth/login.php', {
                        username: this.formData.username,
                        password: this.formData.password
                    });

                    if (response.data.success) {
                        // Сохраняем настройки "запомнить меня"
                        if (this.formData.rememberMe) {
                            localStorage.setItem('drevmaster_username', this.formData.username);
                            localStorage.setItem('drevmaster_remember', 'true');
                        } else {
                            localStorage.removeItem('drevmaster_username');
                            localStorage.removeItem('drevmaster_remember');
                        }

                        showNotification('Добро пожаловать!');
                        
                        // Перенаправляем в зависимости от роли
                        const userRole = response.data.user.role;
                        if (userRole === 'manager') {
                            window.location.href = '/manager/dashboard.php';
                        } else {
                            window.location.href = '/index.php';
                        }
                    }
                } catch (error) {
                    this.error = error.response?.data?.error || 'Ошибка авторизации';
                } finally {
                    this.loading = false;
                }
            }
        }
    }
</script>

<?php include 'includes/footer.php'; ?> 