# Руководство по развертыванию DrevMaster

## Варианты развертывания

### 1. Локальное развертывание с Docker (Рекомендуется)

#### Требования:

- Docker
- Docker Compose

#### Шаги:

1. Клонируйте репозиторий:

```bash
git clone <your-repo-url>
cd DrevMaster
```

2. Запустите скрипт развертывания:

```bash
chmod +x deploy.sh
./deploy.sh
```

3. Откройте браузер: http://localhost:3000

#### Управление:

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Обновление
git pull
./deploy.sh
```

### 2. Развертывание на Vercel (Бесплатно)

#### Шаги:

1. Создайте аккаунт на [Vercel](https://vercel.com)
2. Подключите ваш GitHub репозиторий
3. Настройте переменные окружения в Vercel Dashboard
4. Vercel автоматически развернет приложение

#### Переменные окружения для Vercel:

```
NODE_ENV=production
```

### 3. Развертывание на Railway

#### Шаги:

1. Создайте аккаунт на [Railway](https://railway.app)
2. Подключите GitHub репозиторий
3. Railway автоматически определит Next.js проект
4. Настройте переменные окружения

### 4. Развертывание на Heroku

#### Шаги:

1. Создайте аккаунт на [Heroku](https://heroku.com)
2. Установите Heroku CLI
3. Выполните команды:

```bash
# Логин в Heroku
heroku login

# Создание приложения
heroku create your-drevmaster-app

# Добавление переменных окружения
heroku config:set NODE_ENV=production

# Развертывание
git push heroku main

# Открытие приложения
heroku open
```

### 5. Развертывание на собственном сервере

#### Требования:

- Ubuntu 20.04+ или CentOS 8+
- Node.js 18+
- PM2 (для управления процессами)
- Nginx (для прокси)

#### Шаги:

1. Установите зависимости:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm nginx

# CentOS/RHEL
sudo yum install nodejs npm nginx
```

2. Клонируйте проект:

```bash
git clone <your-repo-url>
cd DrevMaster
```

3. Установите зависимости и соберите проект:

```bash
npm install
npm run build
```

4. Установите PM2:

```bash
npm install -g pm2
```

5. Запустите приложение:

```bash
pm2 start npm --name "drevmaster" -- start
pm2 save
pm2 startup
```

6. Настройте Nginx:

```bash
sudo nano /etc/nginx/sites-available/drevmaster
```

Добавьте конфигурацию:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
```

7. Активируйте сайт:

```bash
sudo ln -s /etc/nginx/sites-available/drevmaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Переменные окружения

Создайте файл `.env.local` для локальной разработки:

```env
NODE_ENV=production
PORT=3000
```

## База данных

⚠️ **Важно**: SQLite база данных (`drevmaster.db`) должна быть доступна для записи. При развертывании убедитесь, что:

1. Файл базы данных копируется в контейнер/сервер
2. У процесса есть права на запись в директорию с базой данных
3. База данных регулярно резервируется

### Резервное копирование базы данных:

```bash
# Создание резервной копии
cp drevmaster.db drevmaster_backup_$(date +%Y%m%d_%H%M%S).db

# Восстановление из резервной копии
cp drevmaster_backup_20241201_143022.db drevmaster.db
```

## Мониторинг и логи

### Docker Compose:

```bash
# Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f drevmaster
```

### PM2:

```bash
# Просмотр логов
pm2 logs drevmaster

# Мониторинг процессов
pm2 monit

# Статус приложений
pm2 status
```

## Обновление приложения

### Docker Compose:

```bash
git pull
./deploy.sh
```

### PM2:

```bash
git pull
npm install
npm run build
pm2 restart drevmaster
```

### Vercel/Railway:

Автоматическое обновление при push в main ветку.

## Устранение неполадок

### Приложение не запускается:

1. Проверьте логи: `docker-compose logs` или `pm2 logs`
2. Убедитесь, что порт 3000 свободен
3. Проверьте права доступа к базе данных

### Ошибки базы данных:

1. Проверьте, что файл `drevmaster.db` существует
2. Убедитесь в правах записи
3. Попробуйте пересоздать базу: удалите файл и перезапустите

### Проблемы с производительностью:

1. Увеличьте память для Node.js: `NODE_OPTIONS="--max-old-space-size=2048"`
2. Настройте кэширование в Nginx
3. Рассмотрите миграцию на PostgreSQL для больших объемов данных

## Безопасность

1. Измените пароль администратора после первого входа
2. Используйте HTTPS в продакшене
3. Настройте файрвол
4. Регулярно обновляйте зависимости: `npm audit fix`

## Поддержка

При возникновении проблем:

1. Проверьте логи приложения
2. Убедитесь в корректности конфигурации
3. Проверьте системные требования
4. Создайте issue в репозитории проекта
