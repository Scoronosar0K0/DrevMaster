#!/bin/bash

echo "🚂 Подготовка к развертыванию DrevMaster на Railway"

# Проверяем что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Добавляем все изменения в git
echo "📦 Добавляем файлы в git..."
git add .

# Коммитим изменения
echo "💾 Создаем коммит..."
git commit -m "Подготовка для Railway деплоя - исправление SQLite проблем"

# Пушим в GitHub
echo "⬆️ Отправляем изменения в GitHub..."
git push

echo ""
echo "✅ Подготовка завершена!"
echo ""
echo "🚂 Теперь откройте Railway и развертывайте:"
echo "1. Откройте https://railway.app"
echo "2. Login через GitHub"
echo "3. New Project → Deploy from GitHub repo"
echo "4. Выберите DrevMaster"
echo "5. Готово!"
echo ""
echo "🎯 Или используйте Render:"
echo "1. Откройте https://render.com"
echo "2. New → Web Service"
echo "3. Connect GitHub репозиторий"
echo "4. Build Command: npm install && npm run build"
echo "5. Start Command: npm start"
echo ""
echo "📊 Логин: admin, пароль: admin" 