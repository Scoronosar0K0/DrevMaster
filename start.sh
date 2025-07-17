#!/bin/bash

# Делаем директорию для базы данных если она не существует
mkdir -p /app/data

# Если база данных не существует, копируем исходную
if [ ! -f "/app/data/drevmaster.db" ]; then
    echo "Инициализация базы данных..."
    cp /app/drevmaster.db /app/data/drevmaster.db
    echo "База данных скопирована"
else
    echo "База данных уже существует"
fi

# Устанавливаем порт по умолчанию если не задан
export PORT=${PORT:-3000}

# Запускаем Next.js приложение
echo "Запуск приложения на порту $PORT..."
npm start 