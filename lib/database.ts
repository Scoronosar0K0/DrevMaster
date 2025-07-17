import { Pool, PoolClient } from "pg";
import bcrypt from "bcryptjs";

// Экспорт sql функции для продакшена
let sql: any;
if (process.env.NODE_ENV === "production") {
  sql = require("@vercel/postgres").sql;
}
export { sql };

// Инициализация пула соединений PostgreSQL
let pool: Pool;

if (process.env.NODE_ENV !== "production") {
  // Для локальной разработки используем pg
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || "postgresql://localhost:5432/drevmaster",
    ssl: false,
  });
}

// Функция для выполнения запросов
export async function query(text: string, params?: any[]): Promise<any> {
  if (process.env.NODE_ENV === "production") {
    return await sql.query(text, params);
  } else {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }
}

// Типы данных
export interface User {
  id: number;
  username: string;
  password: string;
  role: "admin" | "partner" | "user" | "manager";
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

// Инициализация базы данных
export async function initDatabase() {
  try {
    console.log("Инициализация базы данных PostgreSQL...");

    // Создание таблиц
    await createTables();

    // Создание администратора по умолчанию
    await createDefaultAdmin();

    console.log("База данных успешно инициализирована!");
  } catch (error) {
    console.error("Ошибка инициализации базы данных:", error);
    throw error;
  }
}

async function createTables() {
  const tables = [
    // Таблица пользователей
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'partner', 'user', 'manager')),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    )`,

    // Таблица партнеров
    `CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица поставщиков
    `CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица товаров поставщиков
    `CREATE TABLE IF NOT EXISTS supplier_items (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица заказов
    `CREATE TABLE IF NOT EXISTS orders (
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
    )`,

    // Таблица займов
    `CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id),
      order_id INTEGER REFERENCES orders(id),
      amount DECIMAL(10,2) NOT NULL,
      is_paid BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица продаж
    `CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      buyer_name TEXT,
      sale_value DECIMAL(10,2) NOT NULL,
      sale_price DECIMAL(10,2) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица расходов
    `CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'transportation', 'customs', 'other')),
      related_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица логов активности
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Таблица переводов менеджеров
    `CREATE TABLE IF NOT EXISTS manager_transfers (
      id SERIAL PRIMARY KEY,
      from_manager_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id INTEGER NOT NULL REFERENCES users(id),
      amount DECIMAL(10,2) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_by INTEGER REFERENCES users(id),
      approved_at TIMESTAMP
    )`,

    // Таблица долгов поставщиков
    `CREATE TABLE IF NOT EXISTS supplier_debts (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      item_id INTEGER NOT NULL REFERENCES supplier_items(id),
      order_id INTEGER NOT NULL REFERENCES orders(id),
      debt_value DECIMAL(10,2) NOT NULL,
      is_settled BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      settled_at TIMESTAMP
    )`,

    // Таблица продаж менеджеров
    `CREATE TABLE IF NOT EXISTS manager_sales (
      id SERIAL PRIMARY KEY,
      manager_id INTEGER NOT NULL REFERENCES users(id),
      related_sale_id INTEGER NOT NULL REFERENCES sales(id),
      sale_value DECIMAL(10,2) NOT NULL,
      sale_price DECIMAL(10,2) NOT NULL,
      buyer_name TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const table of tables) {
    await query(table);
  }
}

async function createDefaultAdmin() {
  try {
    // Проверяем, существует ли администратор
    const adminResult = await query(
      "SELECT id FROM users WHERE username = $1",
      ["admin"]
    );

    if (adminResult.rows && adminResult.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin", 10);

      await query(
        `INSERT INTO users (username, password, role, name, email)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "admin",
          hashedPassword,
          "admin",
          "Администратор",
          "admin@drevmaster.com",
        ]
      );

      console.log("Создан пользователь admin с паролем: admin");
    }
  } catch (error) {
    console.error("Ошибка создания администратора:", error);
  }
}

// Утилитарные функции для работы с базой данных
export class DatabaseService {
  // Пользователи
  static async getUsers() {
    const result = await query("SELECT * FROM users ORDER BY created_at DESC");
    return result.rows;
  }

  static async getUserById(id: number) {
    const result = await query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0];
  }

  static async getUserByUsername(username: string) {
    const result = await query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    return result.rows[0];
  }

  // Поставщики
  static async getSuppliers() {
    const result = await query(
      "SELECT * FROM suppliers ORDER BY created_at DESC"
    );
    return result.rows;
  }

  static async getSupplierById(id: number) {
    const result = await query("SELECT * FROM suppliers WHERE id = $1", [id]);
    return result.rows[0];
  }

  // Заказы
  static async getOrders() {
    const result = await query(`
      SELECT o.*, s.name as supplier_name, si.name as item_name 
      FROM orders o
      JOIN suppliers s ON o.supplier_id = s.id
      JOIN supplier_items si ON o.item_id = si.id
      ORDER BY o.created_at DESC
    `);
    return result.rows;
  }

  static async getOrderById(id: number) {
    const result = await query("SELECT * FROM orders WHERE id = $1", [id]);
    return result.rows[0];
  }

  // Займы
  static async getLoans() {
    const result = await query(`
      SELECT l.*, u.name as partner_name 
      FROM loans l
      JOIN partners p ON l.partner_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY l.created_at DESC
    `);
    return result.rows;
  }

  // Логи активности
  static async addActivityLog(
    userId: number,
    action: string,
    entityType: string,
    details?: string
  ) {
    await query(
      "INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, $2, $3, $4)",
      [userId, action, entityType, details]
    );
  }
}

// Экспортируем инициализацию для использования при старте приложения
export default DatabaseService;
