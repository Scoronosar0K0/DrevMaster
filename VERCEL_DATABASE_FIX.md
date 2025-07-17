# 🔧 Исправление проблемы базы данных на Vercel

## ❌ Проблема

```
SqliteError: attempt to write a readonly database
code: 'SQLITE_READONLY'
```

На Vercel файловая система только для чтения, поэтому SQLite не может записывать данные.

## ✅ РЕШЕНИЕ: Перейти на Vercel Postgres

### Шаг 1: Создать базу данных в Vercel

1. Откройте [Vercel Dashboard](https://vercel.com)
2. Перейдите в ваш проект → **Storage** → **Create Database**
3. Выберите **Postgres** → **Continue**
4. Назовите базу `drevmaster-db` → **Create**
5. Скопируйте переменные среды

### Шаг 2: Установить зависимости

```bash
npm install @vercel/postgres
npm uninstall better-sqlite3 sqlite3
```

### Шаг 3: Обновить конфигурацию базы данных

Замените содержимое `lib/database.ts`:

```typescript
import { sql } from "@vercel/postgres";

// Инициализация базы данных PostgreSQL
export async function initDatabase() {
  try {
    // Создаем таблицы если их нет
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'partner', 'user', 'manager')),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS supplier_items (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(255) UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        measurement VARCHAR(50) DEFAULT 'm3',
        value REAL NOT NULL,
        price_per_unit REAL,
        total_price REAL,
        status VARCHAR(50) DEFAULT 'paid' CHECK (status IN ('paid', 'on_way', 'warehouse', 'sold', 'loan')),
        containers INTEGER,
        container_loads TEXT,
        transportation_cost REAL,
        customer_fee REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (item_id) REFERENCES supplier_items (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL,
        order_id INTEGER,
        amount REAL NOT NULL,
        is_paid BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partner_id) REFERENCES partners (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        buyer_name TEXT,
        sale_value REAL NOT NULL,
        sale_price REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        amount REAL NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'transportation', 'customs', 'other')),
        related_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS manager_transfers (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS manager_sales (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL,
        sale_value REAL NOT NULL,
        sale_price REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        buyer_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS supplier_debts (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('add_to_order', 'paid_separately')),
        order_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )
    `;

    // Создаем админа если его нет
    const adminExists = await sql`
      SELECT id FROM users WHERE username = 'admin' LIMIT 1
    `;

    if (adminExists.rows.length === 0) {
      const bcrypt = require("bcryptjs");
      const hashedPassword = bcrypt.hashSync("admin", 10);

      await sql`
        INSERT INTO users (username, password, role, name, email, is_active)
        VALUES ('admin', ${hashedPassword}, 'admin', 'Администратор', 'admin@drevmaster.com', true)
      `;

      console.log("Создан пользователь admin с паролем: admin");
    }
  } catch (error) {
    console.error("Ошибка инициализации базы данных:", error);
  }
}

// Экспортируем sql для использования в API
export { sql };
```

### Шаг 4: Настроить переменные среды

В Vercel Dashboard → Settings → Environment Variables добавьте:

**Из настроек PostgreSQL Vercel скопируйте и добавьте:**

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Шаг 5: Обновить API роуты

Все запросы нужно будет изменить с SQLite синтаксиса на PostgreSQL.

**Пример изменения (`app/api/users/[id]/route.ts`):**

```typescript
// Старый SQLite код:
// const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

// Новый PostgreSQL код:
const users = await sql`SELECT * FROM users WHERE id = ${id}`;
const user = users.rows[0];
```

## 🎯 РЕШЕНИЕ 2: Railway/Render (альтернатива)

Если Vercel не подходит, используйте платформы с поддержкой файловой системы:

### Railway

1. Зайдите на [railway.app](https://railway.app)
2. Connect GitHub → Deploy
3. SQLite будет работать из коробки

### Render

1. Зайдите на [render.com](https://render.com)
2. New Web Service → Connect GitHub
3. SQLite будет работать из коробки

## 🚀 Быстрый запуск

Если хотите сразу протестировать:

```bash
# Клонируйте в новую папку для PostgreSQL версии
git clone [ваш-репозиторий] drevmaster-postgres
cd drevmaster-postgres

# Обновите зависимости
npm install @vercel/postgres
npm uninstall better-sqlite3 sqlite3

# Деплой на Vercel с PostgreSQL
```

## 📋 Список изменений для миграции

- [ ] Установить `@vercel/postgres`
- [ ] Удалить `better-sqlite3`, `sqlite3`
- [ ] Обновить `lib/database.ts`
- [ ] Изменить все API роуты с SQLite на PostgreSQL синтаксис
- [ ] Настроить переменные среды в Vercel
- [ ] Протестировать на локальной среде с PostgreSQL
- [ ] Деплой на Vercel

Выберите подходящее решение и следуйте инструкциям!
