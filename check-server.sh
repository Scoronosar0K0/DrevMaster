#!/bin/bash

echo "🔍 Проверяем настройки сервера..."

ssh root@194.87.201.205 << 'EOF'
    echo "📁 Проверяем директорию приложения..."
    ls -la /var/www/drevmaster/drevmaster/
    
    echo ""
    echo "🔧 Проверяем файл .env.local..."
    cat /var/www/drevmaster/drevmaster/.env.local
    
    echo ""
    echo "📊 Проверяем статус PM2..."
    pm2 status
    
    echo ""
    echo "📋 Проверяем логи приложения..."
    pm2 logs drevmaster --lines 20
    
    echo ""
    echo "🌐 Проверяем статус Nginx..."
    systemctl status nginx --no-pager
    
    echo ""
    echo "🔌 Проверяем порты..."
    netstat -tlnp | grep :80
    netstat -tlnp | grep :3000
    
    echo ""
    echo "🍪 Проверяем cookie в браузере (если доступен)..."
    echo "Откройте DevTools (F12) и проверьте вкладку Application/Storage -> Cookies"
EOF

echo "✅ Проверка завершена!"
