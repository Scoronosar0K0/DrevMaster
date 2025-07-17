# Инструкции по деплою DrevMaster на Vercel

## 🚀 Быстрый деплой

### 1. Подключение к Vercel

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт Vercel
vercel login

# Подключите проект к Vercel
vercel
```

### 2. Создание PostgreSQL базы данных

#### Вариант A: Vercel Postgres (рекомендуется)
```bash
# Создайте Postgres базу данных в Vercel
vercel postgres create

# Это автоматически добавит переменную DATABASE_URL в ваш проект
```

#### Вариант B: Внешний провайдер
Вы можете использовать любого PostgreSQL провайдера:
- [Supabase](https://supabase.com/) (бесплатный план)
- [Railway](https://railway.app/) (бесплатный план)
- [Neon](https://neon.tech/) (бесплатный план)
- [PlanetScale](https://planetscale.com/) (бесплатный план)

### 3. Настройка переменных окружения

В дашборде Vercel перейдите в **Settings** → **Environment Variables** и добавьте:

#### Обязательные переменные:
```
DATABASE_URL=postgresql://username:password@host:5432/database
JWT_SECRET=drevmaster-secret-key-2024
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app
```

#### Генерация секретных ключей:
```bash
# Для NEXTAUTH_SECRET
openssl rand -base64 32

# Или используйте онлайн генератор
# https://generate-secret.vercel.app/32
```

### 4. Деплой приложения

```bash
# Если используете Vercel CLI
vercel --prod

# Или настройте автоматический деплой через Git
git push origin main
```

### 5. Инициализация базы данных

После успешного деплоя вызовите API endpoint для создания таблиц:

```bash
# Через curl
curl -X GET https://your-app.vercel.app/api/init-database

# Или откройте в браузере
https://your-app.vercel.app/api/init-database
```

## 🔧 Пошаговая настройка

### Шаг 1: Создание проекта в Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "New Project"
3. Подключите ваш GitHub репозиторий
4. Выберите репозиторий `DrevMaster`

### Шаг 2: Настройка базы данных

#### Для Vercel Postgres:
1. В дашборде проекта нажмите "Storage"
2. Выберите "Connect Store" → "Postgres"
3. Создайте новую базу данных
4. Vercel автоматически добавит `DATABASE_URL`

#### Для внешнего провайдера:
1. Создайте базу данных у выбранного провайдера
2. Скопируйте строку подключения
3. Добавьте как переменную окружения `DATABASE_URL`

### Шаг 3: Переменные окружения

В **Settings** → **Environment Variables** добавьте:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `DATABASE_URL` | `postgresql://...` | Строка подключения к PostgreSQL |
| `JWT_SECRET` | `drevmaster-secret-key-2024` | Секрет для JWT токенов |
| `NEXTAUTH_SECRET` | `random-string-32-chars` | Секрет для NextAuth |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | URL вашего приложения |

### Шаг 4: Деплой

1. Нажмите "Deploy" в дашборде Vercel
2. Дождитесь завершения сборки
3. Проверьте, что приложение работает

### Шаг 5: Инициализация БД

1. Откройте `https://your-app.vercel.app/api/init-database`
2. Должно появиться сообщение об успешной инициализации
3. Создастся администратор: `admin` / `admin`

## 🐛 Решение проблем

### Ошибка "DATABASE_URL references Secret which does not exist"

**Решение:** Убедитесь, что переменная `DATABASE_URL` добавлена в Environment Variables в дашборде Vercel.

### Ошибка подключения к базе данных

**Проверьте:**
1. Правильность строки подключения
2. Доступность базы данных из интернета
3. Настройки SSL (если требуется)

### Ошибка "Cannot find module 'pg'"

**Решение:** Убедитесь, что в `package.json` есть зависимости:
```json
{
  "dependencies": {
    "@vercel/postgres": "^0.5.1",
    "pg": "^8.11.3"
  }
}
```

### Функции превышают лимит времени

**Решение:** В `vercel.json` уже настроен `maxDuration: 60` для API функций.

## 📋 Проверка работоспособности

После деплоя проверьте:

1. **Главная страница:** `https://your-app.vercel.app`
2. **API инициализации:** `https://your-app.vercel.app/api/init-database`
3. **Вход в систему:** Логин `admin`, пароль `admin`

## 🔐 Безопасность

### После первого входа:
1. Смените пароль администратора
2. Обновите `JWT_SECRET` на уникальный
3. Настройте HTTPS (автоматически в Vercel)

### Рекомендации:
- Используйте сильные пароли
- Регулярно обновляйте секретные ключи
- Настройте мониторинг и логирование

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи в Vercel Dashboard
2. Убедитесь, что все переменные окружения настроены
3. Проверьте подключение к базе данных
4. Обратитесь к документации Vercel

---

**Успешного деплоя!** 🚀 