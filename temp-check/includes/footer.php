    <!-- Общие скрипты -->
    <script>
        // Конфигурация Axios
        axios.defaults.headers.common['Content-Type'] = 'application/json';
        
        // Функция для показа уведомлений
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg text-white font-medium shadow-lg transform transition-all duration-300 ${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 
                type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
            }`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // Анимация появления
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // Автоматическое скрытие
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }
        
        // Функция для форматирования денег
        function formatMoney(amount) {
            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(amount);
        }
        
        // Функция для форматирования даты
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Обработка ошибок AJAX
        axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    // Перенаправляем на страницу логина при ошибке авторизации
                    window.location.href = '/login.php';
                } else {
                    const message = error.response?.data?.error || 'Произошла ошибка';
                    showNotification(message, 'error');
                }
                return Promise.reject(error);
            }
        );
        
        // Функция для подтверждения действий
        function confirmAction(message, callback) {
            if (confirm(message)) {
                callback();
            }
        }
        
        // Функция для переключения видимости пароля
        function togglePasswordVisibility(inputId, buttonId) {
            const input = document.getElementById(inputId);
            const button = document.getElementById(buttonId);
            
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '👁️';
            } else {
                input.type = 'password';
                button.textContent = '👁️‍🗨️';
            }
        }
    </script>
</body>
</html> 