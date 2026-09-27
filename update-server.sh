#!/bin/bash

echo "🔄 Обновляем DrevMaster на VPS сервере..."

# Подключение к серверу и обновление
ssh root@194.87.201.205 << 'EOF'
    echo "📁 Переходим в директорию приложения..."
    cd /var/www/drevmaster/drevmaster
    
    # Публично известный секрет из старой документации заменяем случайным
    # (все пользователи один раз войдут заново)
    if grep -q '^JWT_SECRET=drevmaster-secret-key-2024$' ".env.local"; then
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" ".env.local"
    fi

    echo "💾 Резервная копия базы данных..."
    DB_PATH=$(grep '^DATABASE_PATH=' .env.local 2>/dev/null | cut -d= -f2-)
    DB_PATH=${DB_PATH:-$(pwd)/drevmaster.db}
    mkdir -p /var/lib/drevmaster/backups
    if [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "/var/lib/drevmaster/backups/drevmaster-$(date +%Y%m%d-%H%M%S).db"
    fi

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
