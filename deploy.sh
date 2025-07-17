#!/bin/bash

echo "🚀 Подготовка к развертыванию DrevMaster..."

# Проверяем, установлен ли Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker."
    exit 1
fi

# Проверяем, установлен ли Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose."
    exit 1
fi

echo "✅ Docker и Docker Compose найдены"

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Собираем новый образ
echo "🔨 Сборка Docker образа..."
docker-compose build --no-cache

# Запускаем приложение
echo "🚀 Запуск приложения..."
docker-compose up -d

# Ждем немного для запуска
echo "⏳ Ожидание запуска приложения..."
sleep 10

# Проверяем статус
echo "🔍 Проверка статуса приложения..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Приложение успешно запущено!"
    echo "🌐 Откройте http://localhost:3000 в браузере"
    echo "🔑 Логин: admin, Пароль: admin"
else
    echo "❌ Ошибка запуска приложения"
    echo "📋 Логи контейнера:"
    docker-compose logs
    exit 1
fi

echo "📋 Полезные команды:"
echo "  docker-compose logs -f    # Просмотр логов"
echo "  docker-compose down       # Остановка приложения"
echo "  docker-compose restart    # Перезапуск приложения" 