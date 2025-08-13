#!/bin/bash

echo "🔄 Обновляем DrevMaster на VPS сервере..."

# Подключение к серверу и обновление
ssh root@194.87.201.205 << 'EOF'
    echo "📁 Переходим в директорию приложения..."
    cd /var/www/drevmaster/drevmaster
    
    echo "📥 Получаем последние изменения..."
    git pull origin main
    
    echo "📦 Устанавливаем зависимости..."
    npm install
    
    echo "🔧 Собираем приложение..."
    npm run build
    
    echo "🔄 Перезапускаем приложение..."
    pm2 restart drevmaster
    
    echo "📊 Проверяем статус..."
    pm2 status drevmaster
    
    echo "📋 Проверяем логи..."
    pm2 logs drevmaster --lines 10
EOF

echo "✅ Обновление завершено!"
echo "🌐 Приложение доступно по адресу: http://194.87.201.205"
