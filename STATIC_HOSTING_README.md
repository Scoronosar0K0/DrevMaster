# Развертывание DrevMaster на статическом хостинге

## Для хостингов БЕЗ доступа к командной строке (Timeweb, Beget, и др.)

### Шаг 1: Создание статической сборки (на вашем компьютере)

1. Убедитесь, что у вас установлен Node.js
2. Откройте терминал в папке проекта
3. Выполните команды:

```bash
npm install
npm run build
```

### Шаг 2: Файлы для загрузки на хостинг

После сборки в папке `out/` будут созданы статические файлы.

**ВАЖНО:** Загрузите на хостинг следующие файлы:

1. **Все файлы из папки `out/`** - в корневую папку сайта
2. **База данных:** `drevmaster.db` - в корневую папку
3. **Файл `.htaccess`** - в корневую папку

### Шаг 3: Содержимое .htaccess для хостинга

```apache
RewriteEngine On

# Обработка API маршрутов
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ /api/$1.html [L]

# Обработка динамических маршрутов
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^.]+)$ /$1.html [L]

# Обработка корневого маршрута
RewriteCond %{REQUEST_URI} ^/$
RewriteRule ^$ /index.html [L]

# Обработка маршрутов с параметрами
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.+)$ /$1/index.html [L]

# Заголовки безопасности
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# CORS для API
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

# Кэширование статических файлов
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</FilesMatch>
```

### Шаг 4: Проверка работы

1. Загрузите файлы на хостинг
2. Откройте ваш сайт в браузере
3. Проверьте авторизацию (admin/admin)

### Возможные проблемы и решения

#### Проблема: 404 ошибки на маршрутах

**Решение:** Убедитесь, что `.htaccess` загружен в корневую папку

#### Проблема: API не работает

**Решение:** API маршруты в статической сборке могут не работать. Рассмотрите альтернативы:

1. **Vercel (рекомендуется):**

   - Бесплатный хостинг с поддержкой Next.js
   - Автоматическое развертывание из GitHub
   - Полная поддержка API

2. **Netlify:**
   - Бесплатный план
   - Поддержка serverless функций

### Альтернативное решение: Использование Vercel

1. Зарегистрируйтесь на vercel.com
2. Подключите ваш GitHub репозиторий
3. Автоматическое развертывание при каждом push

### Структура файлов на хостинге

```
public_html/
├── .htaccess
├── drevmaster.db
├── index.html
├── _next/
│   ├── static/
│   └── ...
├── api/
│   ├── auth/
│   ├── orders/
│   └── ...
└── ...остальные файлы из папки out/
```

### Важные замечания

1. **База данных:** SQLite файл должен иметь права записи (chmod 666)
2. **Безопасность:** Смените JWT секрет в production
3. **HTTPS:** Рекомендуется использовать SSL сертификат
4. **Резервное копирование:** Регулярно создавайте бэкапы базы данных

### Поддержка

Если возникают проблемы с развертыванием, рассмотрите переход на платформы с полной поддержкой Node.js:

- Vercel (бесплатно)
- Netlify (бесплатно)
- Railway
- Render
