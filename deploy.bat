@echo off
chcp 65001 >nul

echo 🚂 Подготовка к развертыванию DrevMaster на Railway

REM Проверяем что мы в правильной директории
if not exist "package.json" (
    echo ❌ Ошибка: Запустите скрипт из корневой директории проекта
    pause
    exit /b 1
)

REM Добавляем все изменения в git
echo 📦 Добавляем файлы в git...
git add .

REM Коммитим изменения
echo 💾 Создаем коммит...
git commit -m "Подготовка для Railway деплоя - исправление SQLite проблем"

REM Пушим в GitHub
echo ⬆️ Отправляем изменения в GitHub...
git push

echo.
echo ✅ Подготовка завершена!
echo.
echo 🚂 Теперь откройте Railway и развертывайте:
echo 1. Откройте https://railway.app
echo 2. Login через GitHub
echo 3. New Project → Deploy from GitHub repo
echo 4. Выберите DrevMaster
echo 5. Готово!
echo.
echo 🎯 Или используйте Render:
echo 1. Откройте https://render.com
echo 2. New → Web Service
echo 3. Connect GitHub репозиторий
echo 4. Build Command: npm install ^&^& npm run build
echo 5. Start Command: npm start
echo.
echo 📊 Логин: admin, пароль: admin

pause 