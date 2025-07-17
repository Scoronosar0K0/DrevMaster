# DrevMaster - Система управления деревообрабатывающим бизнесом

Современное веб-приложение для управления деревообрабатывающим бизнесом с функциями управления заказами, партнерами, займами и аналитикой.

## 🚀 Быстрый старт

### Локальная разработка

1. **Клонирование и установка зависимостей:**

```bash
git clone <your-repo-url>
cd DrevMaster
npm install
```

2. **Настройка базы данных:**

```bash
# Создайте PostgreSQL базу данных
createdb drevmaster

# Скопируйте и настройте переменные окружения
cp .env.example .env.local

# В .env.local укажите:
DATABASE_URL="postgresql://username:password@localhost:5432/drevmaster"
JWT_SECRET="drevmaster-secret-key-2024"
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

3. **Инициализация базы данных:**

```bash
npm run db:setup
```

4. **Запуск приложения:**

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

**Данные для входа:**

- Логин: `admin`
- Пароль: `admin`

## 🌐 Деплой на Vercel

### Подготовка к деплою

1. **Создание PostgreSQL базы данных**

Вы можете использовать любого PostgreSQL провайдера:

- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase](https://supabase.com/)
- [Railway](https://railway.app/)
- [PlanetScale](https://planetscale.com/)
- [Neon](https://neon.tech/)

Для Vercel Postgres:

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# Создайте Postgres базу данных
vercel postgres create
```

2. **Настройка переменных окружения в Vercel**

В дашборде Vercel перейдите в Settings → Environment Variables и добавьте:

```
DATABASE_URL=postgresql://username:password@host:5432/database
JWT_SECRET=drevmaster-secret-key-2024
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=https://your-app.vercel.app
```

3. **Деплой приложения**

```bash
# Подключите к Vercel
vercel

# Или автоматический деплой через Git
git push origin main
```

4. **Инициализация базы данных на продакшене**

После первого деплоя выполните:

```bash
# Через Vercel CLI
vercel env pull .env.production
npm run db:setup
```

Или создайте API эндпоинт для инициализации и вызовите его один раз:

```
GET https://your-app.vercel.app/api/init-database
```

### Миграция с SQLite на PostgreSQL

Если у вас есть существующие данные в SQLite:

1. **Экспорт данных из SQLite:**

```bash
# Создайте дамп существующих данных
node scripts/export-sqlite-data.js > data-backup.json
```

2. **Импорт в PostgreSQL:**

```bash
# После настройки PostgreSQL
node scripts/import-to-postgres.js data-backup.json
```

## 🔧 Архитектура

### Технологический стек

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **База данных:** PostgreSQL
- **Аутентификация:** JWT с jose
- **Деплой:** Vercel

### Структура базы данных

**Основные таблицы:**

- `users` - Пользователи системы (админы, партнеры, менеджеры)
- `suppliers` - Поставщики
- `supplier_items` - Товары поставщиков
- `orders` - Заказы
- `loans` - Займы от партнеров
- `sales` - Продажи
- `expenses` - Расходы
- `activity_logs` - Журнал активности

### API Endpoints

**Аутентификация:**

- `POST /api/auth/login` - Вход в систему
- `DELETE /api/auth/login` - Выход из системы

**Управление заказами:**

- `GET /api/orders` - Список заказов
- `POST /api/orders` - Создание заказа
- `POST /api/orders/[id]/pay-transportation` - Оплата транспорта
- `POST /api/orders/[id]/pay-customer-fee` - Оплата таможни
- `POST /api/orders/[id]/sell` - Продажа заказа

**Финансы:**

- `GET /api/cash/balance` - Текущий баланс
- `POST /api/cash/expense` - Добавление расхода
- `GET /api/loans` - Список займов
- `POST /api/loans/[id]/repay` - Погашение займа

**Аналитика:**

- `GET /api/analytics` - Дашборд аналитики (только для админов)

## 🔄 Миграция API маршрутов

При переходе с SQLite на PostgreSQL необходимо обновить API маршруты. Основные изменения:

### Замена db.prepare() на query()

**Было (SQLite):**

```typescript
import { db } from "@/lib/database";

const users = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
```

**Стало (PostgreSQL):**

```typescript
import { query } from "@/lib/database";

const result = await query("SELECT * FROM users WHERE id = $1", [id]);
const users = result.rows;
```

### Параметры запросов

- SQLite: `?` параметры
- PostgreSQL: `$1, $2, $3` параметры

### Транзакции

**Было:**

```typescript
const transaction = db.transaction(() => {
  db.prepare("INSERT ...").run();
  db.prepare("UPDATE ...").run();
});
transaction();
```

**Стало:**

```typescript
await query("BEGIN");
try {
  await query("INSERT ...", []);
  await query("UPDATE ...", []);
  await query("COMMIT");
} catch (error) {
  await query("ROLLBACK");
  throw error;
}
```

## 🛠️ Скрипты

- `npm run dev` - Запуск в режиме разработки
- `npm run build` - Сборка для продакшена
- `npm run start` - Запуск продакшн версии
- `npm run db:migrate` - Создание таблиц БД
- `npm run db:setup` - Полная настройка БД с тестовыми данными
- `npm run seed` - Наполнение БД тестовыми данными

## 📊 Функциональность

### Для администраторов

- 📈 Аналитический дашборд с отчетами
- 📦 Управление заказами и поставщиками
- 💰 Контроль финансов и займов
- 👥 Управление пользователями
- 📋 Просмотр всех операций

### Для партнеров

- 💵 Выдача займов компании
- 📊 Просмотр истории займов
- 📈 Личная статистика

### Для менеджеров

- 🏪 Управление складскими остатками
- 💼 Продажа товаров клиентам
- 💸 Запрос переводов средств
- 📊 Личная статистика продаж

## 🔐 Безопасность

- JWT токены для аутентификации
- Роле-основанный контроль доступа
- Хеширование паролей с bcryptjs
- Валидация данных на сервере
- Защищенные API endpoints

## 🐛 Решение проблем

### Проблемы с базой данных

1. **Ошибка подключения к PostgreSQL:**

```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Проверьте доступность БД
psql $DATABASE_URL -c "SELECT 1"
```

2. **Таблицы не созданы:**

```bash
# Выполните миграцию
npm run db:migrate
```

3. **Нет администратора:**

```bash
# Создайте админа
npm run db:setup
```

### Проблемы с Vercel

1. **Функции превышают лимит времени:**

   - Добавлено `maxDuration: 60` в vercel.json

2. **Переменные окружения не загружаются:**
   - Проверьте настройки в дашборде Vercel
   - Убедитесь, что переменные добавлены для правильного environment

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи в Vercel Dashboard
2. Убедитесь, что все переменные окружения настроены
3. Проверьте подключение к базе данных
4. Откройте issue в репозитории

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей.
