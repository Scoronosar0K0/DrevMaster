# Настройка GitHub репозитория для DrevMaster

## 📋 Пошаговая инструкция

### 1. Создание репозитория на GitHub

1. Перейдите на [GitHub.com](https://github.com)
2. Нажмите кнопку **"New repository"** (зеленая кнопка)
3. Заполните форму:
   - **Repository name:** `drevmaster`
   - **Description:** `Система управления заказами древесины`
   - **Visibility:** Public или Private (на ваш выбор)
   - **НЕ** ставьте галочки на "Add a README file", "Add .gitignore", "Choose a license"
4. Нажмите **"Create repository"**

### 2. Подключение локального репозитория к GitHub

После создания репозитория GitHub покажет инструкции. Выполните следующие команды:

```bash
# Добавляем удаленный репозиторий (замените YOUR_USERNAME на ваше имя пользователя)
git remote add origin https://github.com/YOUR_USERNAME/drevmaster.git

# Переименовываем ветку в main (если нужно)
git branch -M main

# Отправляем код на GitHub
git push -u origin main
```

### 3. Обновление скрипта деплоя

После создания репозитория нужно обновить URL в файле `deploy.sh`:

1. Откройте файл `deploy.sh`
2. Найдите строку:
   ```bash
   git clone https://github.com/your-username/drevmaster.git
   ```
3. Замените `your-username` на ваше имя пользователя GitHub
4. Сохраните файл

### 4. Обновление README.md

Также обновите URL в файле `README.md`:

1. Откройте файл `README.md`
2. Найдите строку:
   ```bash
   git clone https://github.com/your-username/drevmaster.git
   ```
3. Замените `your-username` на ваше имя пользователя GitHub
4. Сохраните файл

### 5. Отправка обновлений на GitHub

```bash
# Добавляем изменения
git add .

# Создаем коммит
git commit -m "Update repository URLs"

# Отправляем на GitHub
git push
```

## 🚀 Деплой на VPS

После настройки GitHub репозитория можно развернуть приложение на VPS:

### Автоматический деплой (рекомендуется)

```bash
# Делаем скрипт исполняемым
chmod +x deploy.sh

# Запускаем деплой
./deploy.sh
```

### Ручной деплой

```bash
# Подключение к серверу
ssh root@194.87.201.205

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Клонирование проекта (замените YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/drevmaster.git
cd drevmaster

# Установка зависимостей
npm install

# Создание файла окружения
cat > .env.local << EOF
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
PORT=3000
EOF

# Сборка приложения
npm run build

# Запуск приложения
npm start
```

## 🔧 Дополнительные настройки

### Настройка домена (опционально)

Если у вас есть домен, настройте его в панели управления Timeweb Cloud:

1. Добавьте A-запись, указывающую на IP `194.87.201.205`
2. Обновите конфигурацию Nginx:
   ```bash
   ssh root@194.87.201.205
   nano /etc/nginx/sites-available/drevmaster
   ```
3. Замените `server_name 194.87.201.205;` на `server_name your-domain.com;`
4. Перезапустите Nginx:
   ```bash
   systemctl restart nginx
   ```

### Настройка SSL (HTTPS)

Для настройки HTTPS используйте Let's Encrypt:

```bash
ssh root@194.87.201.205

# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата (замените your-domain.com)
certbot --nginx -d your-domain.com

# Автоматическое обновление сертификатов
crontab -e
# Добавьте строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи приложения:

   ```bash
   ssh root@194.87.201.205
   pm2 logs drevmaster
   ```

2. Проверьте статус сервисов:

   ```bash
   pm2 status
   systemctl status nginx
   ```

3. Проверьте порты:
   ```bash
   netstat -tlnp | grep :80
   netstat -tlnp | grep :3000
   ```

## 🔐 Безопасность

⚠️ **ВАЖНО:** После успешного деплоя обязательно:

1. Измените пароль администратора в приложении
2. Измените JWT_SECRET в файле `.env.local`
3. Настройте регулярные бэкапы базы данных
4. Обновите пароль root на сервере

---

**Удачи с деплоем! 🚀**
