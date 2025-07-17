@echo off
echo 🚀 Подготовка к развертыванию DrevMaster на Windows...

REM Проверяем, установлен ли Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен. Пожалуйста, установите Docker Desktop.
    pause
    exit /b 1
)

REM Проверяем, установлен ли Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose.
    pause
    exit /b 1
)

echo ✅ Docker и Docker Compose найдены

REM Останавливаем существующие контейнеры
echo 🛑 Остановка существующих контейнеров...
docker-compose down

REM Собираем новый образ
echo 🔨 Сборка Docker образа...
docker-compose build --no-cache

REM Запускаем приложение
echo 🚀 Запуск приложения...
docker-compose up -d

REM Ждем немного для запуска
echo ⏳ Ожидание запуска приложения...
timeout /t 10 /nobreak >nul

REM Проверяем статус
echo 🔍 Проверка статуса приложения...
curl -f http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Приложение успешно запущено!
    echo 🌐 Откройте http://localhost:3000 в браузере
    echo 🔑 Логин: admin, Пароль: admin
) else (
    echo ❌ Ошибка запуска приложения
    echo 📋 Логи контейнера:
    docker-compose logs
    pause
    exit /b 1
)

echo.
echo 📋 Полезные команды:
echo   docker-compose logs -f    # Просмотр логов
echo   docker-compose down       # Остановка приложения
echo   docker-compose restart    # Перезапуск приложения
echo.
pause 