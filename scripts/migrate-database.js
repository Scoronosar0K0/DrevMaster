const { Pool } = require("pg");
require("dotenv").config();

async function migrateDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log("Начинаем миграцию базы данных...");

    // Создание расширений
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Создание таблиц в правильном порядке (с учетом внешних ключей)

    // 1. Таблица пользователей
    await pool.query(`
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
    `);
    console.log("✅ Таблица users создана");

    // 2. Таблица партнеров
    await pool.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица partners создана");

    // 3. Таблица поставщиков
    await pool.query(`
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
    `);
    console.log("✅ Таблица suppliers создана");

    // 4. Таблица товаров поставщиков
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supplier_items (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица supplier_items создана");

    // 5. Таблица заказов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(255) UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        item_id INTEGER NOT NULL REFERENCES supplier_items(id),
        date DATE NOT NULL,
        description TEXT,
        measurement VARCHAR(10) DEFAULT 'm3',
        value DECIMAL(10,2) NOT NULL,
        price_per_unit DECIMAL(10,2),
        total_price DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'on_way', 'warehouse', 'sold', 'loan')),
        containers INTEGER,
        container_loads JSONB,
        transportation_cost DECIMAL(10,2),
        customer_fee DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица orders создана");

    // 6. Таблица займов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER NOT NULL REFERENCES partners(id),
        order_id INTEGER REFERENCES orders(id),
        amount DECIMAL(10,2) NOT NULL,
        is_paid BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица loans создана");

    // 7. Таблица продаж
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        buyer_name TEXT,
        sale_value DECIMAL(10,2) NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица sales создана");

    // 8. Таблица расходов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'transportation', 'customs', 'other')),
        related_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица expenses создана");

    // 9. Таблица логов активности
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица activity_logs создана");

    // 10. Таблица переводов менеджеров
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manager_transfers (
        id SERIAL PRIMARY KEY,
        from_manager_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP
      )
    `);
    console.log("✅ Таблица manager_transfers создана");

    // 11. Таблица долгов поставщиков
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supplier_debts (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        item_id INTEGER NOT NULL REFERENCES supplier_items(id),
        order_id INTEGER NOT NULL REFERENCES orders(id),
        debt_value DECIMAL(10,2) NOT NULL,
        is_settled BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settled_at TIMESTAMP
      )
    `);
    console.log("✅ Таблица supplier_debts создана");

    // 12. Таблица продаж менеджеров
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manager_sales (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL REFERENCES users(id),
        related_sale_id INTEGER NOT NULL REFERENCES sales(id),
        sale_value DECIMAL(10,2) NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        buyer_name TEXT NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Таблица manager_sales создана");

    // Создание индексов для улучшения производительности
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON orders(supplier_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_item_id ON orders(item_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_loans_partner_id ON loans(partner_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)`
    );
    console.log("✅ Индексы созданы");

    console.log("🎉 Миграция базы данных завершена успешно!");
  } catch (error) {
    console.error("❌ Ошибка при миграции базы данных:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateDatabase().catch(console.error);
}

module.exports = migrateDatabase;
