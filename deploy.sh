#!/bin/bash

# Скрипт для деплоя DrevMaster на VPS сервер
# Использование: ./deploy.sh

set -e

echo "🚀 Начинаем деплой DrevMaster на VPS сервер..."

# Проверяем подключение к серверу
echo "📡 Проверяем подключение к серверу..."
if ! ssh -o ConnectTimeout=10 root@194.87.201.205 "echo 'Подключение успешно'" 2>/dev/null; then
    echo "❌ Не удалось подключиться к серверу. Проверьте IP адрес и пароль."
    exit 1
fi

echo "✅ Подключение к серверу установлено"

# Обновляем систему и устанавливаем Node.js
echo "📦 Обновляем систему и устанавливаем Node.js..."
ssh root@194.87.201.205 << 'EOF'
    # Обновляем пакеты
    apt update -y
    
    # Устанавливаем curl если его нет
    apt install -y curl
    
    # Устанавливаем Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
    
    # Проверяем версии
    echo "Node.js версия: $(node --version)"
    echo "npm версия: $(npm --version)"
    
    # Устанавливаем PM2 для управления процессами
    npm install -g pm2
    
    # Создаем директорию для приложения
    mkdir -p /var/www/drevmaster
    cd /var/www/drevmaster
EOF

echo "✅ Node.js установлен"

# Клонируем репозиторий (замените на ваш URL)
echo "📥 Клонируем репозиторий..."
ssh root@194.87.201.205 << 'EOF'
    set -e
    DATA_DIR=/var/lib/drevmaster
    mkdir -p "$DATA_DIR/backups"
    cd /var/www/drevmaster

    # База данных хранится вне папки с кодом ($DATA_DIR), чтобы повторный
    # деплой ее не удалял. Переносим базу из старого расположения внутри checkout
    if [ -f drevmaster/drevmaster.db ] && [ ! -f "$DATA_DIR/drevmaster.db" ]; then
        cp drevmaster/drevmaster.db "$DATA_DIR/drevmaster.db"
    fi

    # Резервная копия базы перед деплоем
    if [ -f "$DATA_DIR/drevmaster.db" ]; then
        cp "$DATA_DIR/drevmaster.db" "$DATA_DIR/backups/drevmaster-$(date +%Y%m%d-%H%M%S).db"
    fi

    # Сохраняем .env.local (в нем JWT_SECRET: при смене секрета всех разлогинит)
    if [ -f drevmaster/.env.local ] && [ ! -f "$DATA_DIR/.env.local" ]; then
        cp drevmaster/.env.local "$DATA_DIR/.env.local"
    fi

    if [ -d drevmaster/.git ]; then
        # Код уже есть — обновляем, а не удаляем вместе с данными
        cd drevmaster
        git fetch origin main
        git reset --hard origin/main
    else
        git clone https://github.com/Scoronosar0K0/drevmaster.git
        cd drevmaster
    fi
EOF

echo "✅ Репозиторий склонирован"

# Устанавливаем зависимости и настраиваем приложение
echo "🔧 Устанавливаем зависимости и настраиваем приложение..."
ssh root@194.87.201.205 << 'EOF'
    cd /var/www/drevmaster/drevmaster
    
    # Устанавливаем зависимости
    npm install
    
    # Файл окружения хранится в /var/lib/drevmaster и создается один раз.
    # Уникальный JWT_SECRET генерируется при первом деплое (известный секрет
    # позволяет подделать вход) и сохраняется между деплоями
    DATA_DIR=/var/lib/drevmaster
    if [ ! -f "$DATA_DIR/.env.local" ]; then
        cat > "$DATA_DIR/.env.local" << ENVEOF
JWT_SECRET=$(openssl rand -hex 32)
DATABASE_PATH=$DATA_DIR/drevmaster.db
NODE_ENV=production
PORT=3000
ENVEOF
    fi
    grep -q '^DATABASE_PATH=' "$DATA_DIR/.env.local" || echo "DATABASE_PATH=$DATA_DIR/drevmaster.db" >> "$DATA_DIR/.env.local"
    # Публично известный секрет из старой документации заменяем случайным
    # (все пользователи один раз войдут заново)
    if grep -q '^JWT_SECRET=drevmaster-secret-key-2024$' "$DATA_DIR/.env.local"; then
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" "$DATA_DIR/.env.local"
    fi
    cp "$DATA_DIR/.env.local" .env.local
    
    # Собираем приложение
    npm run build
    
    # Создаем PM2 конфигурацию
    cat > ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'drevmaster',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/drevmaster/drevmaster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    log_file: '/var/log/drevmaster.log',
    out_file: '/var/log/drevmaster-out.log',
    error_file: '/var/log/drevmaster-error.log'
  }]
};
PM2EOF
EOF

echo "✅ Приложение настроено"

# Запускаем приложение через PM2
echo "🚀 Запускаем приложение..."
ssh root@194.87.201.205 << 'EOF'
    cd /var/www/drevmaster/drevmaster
    
    # Останавливаем предыдущий процесс если есть
    pm2 stop drevmaster 2>/dev/null || true
    pm2 delete drevmaster 2>/dev/null || true
    
    # Запускаем приложение
    pm2 start ecosystem.config.js
    
    # Сохраняем конфигурацию PM2
    pm2 save
    pm2 startup
EOF

echo "✅ Приложение запущено"

# Настраиваем Nginx (опционально)
echo "🌐 Настраиваем Nginx..."
ssh root@194.87.201.205 << 'EOF'
    # Устанавливаем Nginx если его нет
    apt install -y nginx
    
    # Создаем конфигурацию Nginx
    cat > /etc/nginx/sites-available/drevmaster << 'NGINXEOF'
server {
    listen 80;
    server_name 194.87.201.205;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF
    
    # Активируем сайт
    ln -sf /etc/nginx/sites-available/drevmaster /etc/nginx/sites-enabled/
    
    # Удаляем дефолтный сайт
    rm -f /etc/nginx/sites-enabled/default
    
    # Проверяем конфигурацию
    nginx -t
    
    # Перезапускаем Nginx
    systemctl restart nginx
    systemctl enable nginx
EOF

echo "✅ Nginx настроен"

# Настраиваем firewall
echo "🔒 Настраиваем firewall..."
ssh root@194.87.201.205 << 'EOF'
    # Устанавливаем ufw если его нет
    apt install -y ufw
    
    # Разрешаем SSH
    ufw allow ssh
    
    # Разрешаем HTTP и HTTPS
    ufw allow 80
    ufw allow 443
    
    # Включаем firewall
    ufw --force enable
EOF

echo "✅ Firewall настроен"

# Проверяем статус
echo "📊 Проверяем статус приложения..."
ssh root@194.87.201.205 << 'EOF'
    echo "=== Статус PM2 ==="
    pm2 status
    
    echo "=== Статус Nginx ==="
    systemctl status nginx --no-pager
    
    echo "=== Проверка портов ==="
    netstat -tlnp | grep :80
    netstat -tlnp | grep :3000
    
    echo "=== Логи приложения ==="
    tail -n 10 /var/log/drevmaster.log 2>/dev/null || echo "Логи пока пусты"
EOF

echo ""
echo "🎉 Деплой завершен успешно!"
echo ""
echo "📱 Приложение доступно по адресу:"
echo "   http://194.87.201.205"
echo ""
echo "🔑 Для входа используйте:"
echo "   Логин: admin"
echo "   Пароль: admin123"
echo ""
echo "📋 Полезные команды:"
echo "   ssh root@194.87.201.205"
echo "   pm2 status                    # Статус приложения"
echo "   pm2 logs drevmaster          # Логи приложения"
echo "   pm2 restart drevmaster       # Перезапуск приложения"
echo "   pm2 stop drevmaster          # Остановка приложения"
echo ""
echo "⚠️  Не забудьте изменить пароли по умолчанию!"
