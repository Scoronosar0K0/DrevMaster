const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(process.cwd(), "drevmaster.db");
const db = new Database(dbPath);

// Включаем поддержку внешних ключей
db.pragma("foreign_keys = ON");

// Типы данных
export interface User {
  id: number;
  username: string;
  password: string;
  role: "admin" | "partner" | "user";
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
}

export interface Partner {
  id: number;
  user_id: number;
  description?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  description?: string;
  created_at: string;
}

export interface SupplierItem {
  id: number;
  supplier_id: number;
  name: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  supplier_id: number;
  item_id: number;
  date: string;
  description?: string;
  measurement: string;
  value: number;
  price_per_unit?: number;
  total_price?: number;
  status: "paid" | "on_way" | "warehouse" | "sold" | "loan";
  containers?: number;
  container_loads?: string; // JSON массив
  transportation_cost?: number;
  customer_fee?: number;
  created_at: string;
}

export interface Loan {
  id: number;
  partner_id: number;
  order_id?: number;
  amount: number;
  is_paid: boolean;
  created_at: string;
}

export interface Sale {
  id: number;
  order_id: number;
  buyer_name?: string;
  sale_value: number;
  sale_price: number;
  description?: string;
  date: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

// Инициализация таблиц
export function initDatabase() {
  // Безопасная миграция для добавления роли 'manager'
  try {
    // Проверяем, существует ли таблица users
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      )
      .get();

    if (tableExists) {
      // Проверяем текущее ограничение роли
      const createTableSql = db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
        )
        .get() as any;

      if (
        createTableSql &&
        createTableSql.sql &&
        !createTableSql.sql.includes("'manager'")
      ) {
        console.log(
          "Обновляем схему таблицы users для добавления роли manager..."
        );

        // Временно отключаем foreign keys для безопасной миграции
        db.pragma("foreign_keys = OFF");

        // Начинаем транзакцию
        db.exec(`
          BEGIN TRANSACTION;
          
          -- Создаем временную таблицу с новой схемой
          CREATE TABLE users_backup (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'partner', 'user', 'manager')),
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            is_active BOOLEAN DEFAULT true
          );
          
          -- Копируем данные
          INSERT INTO users_backup 
          SELECT id, username, password, role, name, email, phone, created_at, is_active 
          FROM users;
          
          -- Удаляем старую таблицу
          DROP TABLE users;
          
          -- Переименовываем новую таблицу
          ALTER TABLE users_backup RENAME TO users;
          
          COMMIT;
        `);

        // Включаем обратно foreign keys
        db.pragma("foreign_keys = ON");
        console.log("Схема таблицы users обновлена!");
      }
    }
  } catch (e) {
    console.log("Ошибка при миграции users:", e);
    // В случае ошибки включаем обратно foreign keys
    db.pragma("foreign_keys = ON");
  }

  // Безопасная миграция для добавления статуса 'loan'
  try {
    // Проверяем, существует ли таблица orders
    const ordersTableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='orders'"
      )
      .get();

    if (ordersTableExists) {
      // Проверяем текущее ограничение статуса
      const createOrdersTableSql = db
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'"
        )
        .get() as any;

      if (
        createOrdersTableSql &&
        createOrdersTableSql.sql &&
        !createOrdersTableSql.sql.includes("'loan'")
      ) {
        console.log(
          "Обновляем схему таблицы orders для добавления статуса 'loan'..."
        );

        // Временно отключаем foreign keys для безопасной миграции
        db.pragma("foreign_keys = OFF");

        // Начинаем транзакцию
        db.exec(`
          BEGIN TRANSACTION;
          
          -- Создаем временную таблицу с новой схемой
          CREATE TABLE orders_backup (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            supplier_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            measurement TEXT DEFAULT 'm3',
            value REAL NOT NULL,
            price_per_unit REAL,
            total_price REAL,
            status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'on_way', 'warehouse', 'sold', 'loan')),
            containers INTEGER,
            container_loads TEXT,
            transportation_cost REAL,
            customer_fee REAL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
            FOREIGN KEY (item_id) REFERENCES supplier_items (id)
          );
          
          -- Копируем данные
          INSERT INTO orders_backup 
          SELECT id, order_number, supplier_id, item_id, date, description, measurement, value, price_per_unit, total_price, status, containers, container_loads, transportation_cost, customer_fee, created_at 
          FROM orders;
          
          -- Удаляем старую таблицу
          DROP TABLE orders;
          
          -- Переименовываем новую таблицу
          ALTER TABLE orders_backup RENAME TO orders;
          
          COMMIT;
        `);

        // Включаем обратно foreign keys
        db.pragma("foreign_keys = ON");
        console.log("Схема таблицы orders обновлена!");
      }
    }
  } catch (e) {
    console.log("Ошибка при миграции orders:", e);
    // В случае ошибки включаем обратно foreign keys
    db.pragma("foreign_keys = ON");
  }

  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'partner', 'user', 'manager')),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active BOOLEAN DEFAULT true
    )
  `);

  // Таблица партнеров
  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Миграция: добавляем колонки name и contact_info в таблицу partners
  const partnersTableInfo = db.pragma("table_info(partners)");
  const hasNameColumn = partnersTableInfo.some(
    (col: any) => col.name === "name"
  );
  const hasContactInfoColumn = partnersTableInfo.some(
    (col: any) => col.name === "contact_info"
  );

  if (!hasNameColumn) {
    console.log("Добавляем колонку 'name' в таблицу partners...");
    db.exec(`ALTER TABLE partners ADD COLUMN name TEXT`);
  }

  if (!hasContactInfoColumn) {
    console.log("Добавляем колонку 'contact_info' в таблицу partners...");
    db.exec(`ALTER TABLE partners ADD COLUMN contact_info TEXT`);
  }

  // Обновляем существующих партнеров, заполняя name и contact_info из users
  if (!hasNameColumn || !hasContactInfoColumn) {
    console.log("Обновляем данные существующих партнеров...");
    db.exec(`
      UPDATE partners 
      SET name = (SELECT name FROM users WHERE users.id = partners.user_id),
          contact_info = (SELECT COALESCE(email, phone, 'Нет контактной информации') FROM users WHERE users.id = partners.user_id)
      WHERE name IS NULL OR contact_info IS NULL
    `);
  }

  // Таблица поставщиков
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Таблица товаров поставщиков
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
    )
  `);

  // Таблица заказов
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      measurement TEXT DEFAULT 'm3',
      value REAL NOT NULL,
      price_per_unit REAL,
      total_price REAL,
      status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'on_way', 'warehouse', 'sold', 'loan')),
      containers INTEGER,
      container_loads TEXT,
      transportation_cost REAL,
      customer_fee REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
      FOREIGN KEY (item_id) REFERENCES supplier_items (id)
    )
  `);

  // Таблица займов
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      order_id INTEGER,
      amount REAL NOT NULL,
      is_paid BOOLEAN DEFAULT false,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (partner_id) REFERENCES partners (id),
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // Проверяем и обновляем схему займов если нужно
  try {
    // Пытаемся получить схему таблицы loans
    const tableInfo = db.prepare("PRAGMA table_info(loans)").all() as any[];
    const orderIdColumn = tableInfo.find((col) => col.name === "order_id");

    if (orderIdColumn && orderIdColumn.notnull === 1) {
      // Если order_id NOT NULL, пересоздаем таблицу
      console.log("Обновляем схему таблицы loans...");

      db.exec(`
        -- Создаем временную таблицу с новой схемой
        CREATE TABLE loans_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          partner_id INTEGER NOT NULL,
          order_id INTEGER,
          amount REAL NOT NULL,
          is_paid BOOLEAN DEFAULT false,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (partner_id) REFERENCES partners (id),
          FOREIGN KEY (order_id) REFERENCES orders (id)
        );
        
        -- Копируем данные из старой таблицы
        INSERT INTO loans_new (id, partner_id, order_id, amount, is_paid, created_at)
        SELECT id, partner_id, order_id, amount, is_paid, created_at FROM loans;
        
        -- Удаляем старую таблицу
        DROP TABLE loans;
        
        -- Переименовываем новую таблицу
        ALTER TABLE loans_new RENAME TO loans;
      `);

      console.log("Схема таблицы loans обновлена!");
    }
  } catch (error) {
    console.log("Ошибка при проверке схемы loans:", error);
  }

  // Таблица продаж
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      buyer_name TEXT,
      sale_value REAL NOT NULL,
      sale_price REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // Таблица расходов (для отслеживания потраченных средств без изменения займов)
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('order', 'transportation', 'customs', 'other')),
      related_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Таблица логов активности
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Таблица переводов менеджеров
  db.exec(`
    CREATE TABLE IF NOT EXISTS manager_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_manager_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT DEFAULT (datetime('now')),
      approved_by INTEGER,
      approved_at TEXT,
      FOREIGN KEY (from_manager_id) REFERENCES users (id),
      FOREIGN KEY (to_user_id) REFERENCES users (id),
      FOREIGN KEY (approved_by) REFERENCES users (id)
    )
  `);

  // Таблица долгов поставщиков
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      debt_value REAL NOT NULL,
      is_settled BOOLEAN DEFAULT false,
      created_at TEXT DEFAULT (datetime('now')),
      settled_at TEXT,
      FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
      FOREIGN KEY (item_id) REFERENCES supplier_items (id),
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `);

  // Таблица продаж менеджеров
  db.exec(`
    CREATE TABLE IF NOT EXISTS manager_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manager_id INTEGER NOT NULL,
      related_sale_id INTEGER NOT NULL,
      sale_value REAL NOT NULL,
      sale_price REAL NOT NULL,
      buyer_name TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (manager_id) REFERENCES users (id),
      FOREIGN KEY (related_sale_id) REFERENCES sales (id)
    )
  `);

  // Создаем администратора по умолчанию
  const adminExists = db
    .prepare("SELECT id FROM users WHERE username = 'admin'")
    .get();
  if (!adminExists) {
    const bcrypt = require("bcryptjs");
    const hashedPassword = bcrypt.hashSync("admin123", 10);

    db.prepare(
      `
      INSERT INTO users (username, password, role, name, email)
      VALUES ('admin', ?, 'admin', 'Администратор', 'admin@drevmaster.com')
    `
    ).run(hashedPassword);

    console.log("Создан пользователь admin с паролем: admin123");
  }
}

// Экспортируем базу данных
export { db };
