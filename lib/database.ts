const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

// DATABASE_PATH позволяет хранить базу вне папки с кодом (см. deploy.sh)
const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), "drevmaster.db");
const db = new Database(dbPath);

// Включаем поддержку внешних ключей
db.pragma("foreign_keys = ON");

// Ждем освобождения блокировки вместо мгновенной ошибки SQLITE_BUSY
// (при сборке несколько процессов Next.js открывают базу одновременно)
db.pragma("busy_timeout = 5000");

// Выполняет ALTER TABLE ADD COLUMN, игнорируя ошибку, если другой процесс
// уже успел добавить колонку
function addColumnIfMissing(sql: string) {
  try {
    db.exec(sql);
  } catch (e: any) {
    if (!String(e?.message).includes("duplicate column name")) throw e;
  }
}

let isInitialized = false;

function findOrdersOldReferences() {
  return db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name != 'orders_old' AND sql LIKE '%orders_old%'"
    )
    .all() as { name: string; sql: string }[];
}

function repairOrdersOldReferences() {
  if (findOrdersOldReferences().length === 0) return;

  db.pragma("foreign_keys = OFF");
  // Не даем SQLite переписывать ссылки других таблиц при переименовании
  db.pragma("legacy_alter_table = ON");
  try {
    // IMMEDIATE сразу берет блокировку записи: параллельный процесс сборки
    // дождется ее и перечитает схему, уже исправленную первым процессом
    db.transaction(() => {
      const broken = findOrdersOldReferences();
      if (broken.length === 0) return;
      console.log(
        `Исправляем внешние ключи на orders_old в таблицах: ${broken
          .map((t) => t.name)
          .join(", ")}`
      );
      for (const table of broken) {
        const tmp = `${table.name}__repair`;
        const fixedSql = table.sql
          .replace(/["'`]?\borders_old\b["'`]?/g, "orders")
          .replace(
            /^CREATE TABLE\s+(IF NOT EXISTS\s+)?["'`]?\w+["'`]?/i,
            `CREATE TABLE "${tmp}"`
          );
        const columns = (db.pragma(`table_info("${table.name}")`) as any[])
          .map((col) => `"${col.name}"`)
          .join(", ");

        db.exec(fixedSql);
        db.exec(
          `INSERT INTO "${tmp}" (${columns}) SELECT ${columns} FROM "${table.name}"`
        );
        db.exec(`DROP TABLE "${table.name}"`);
        db.exec(`ALTER TABLE "${tmp}" RENAME TO "${table.name}"`);
      }
    }).immediate();
  } finally {
    db.pragma("legacy_alter_table = OFF");
    db.pragma("foreign_keys = ON");
  }

  const problems = db.pragma("foreign_key_check") as unknown[];
  if (problems.length > 0) {
    console.log("Нарушения внешних ключей после ремонта:", problems);
  }
}

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
  status: "paid" | "in_container" | "on_way" | "warehouse" | "sold" | "loan";
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
// Старый код при каждой перепродаже менеджером создавал еще один займ на
// сумму перепродажи (без order_id) в той же транзакции, что и запись в
// manager_sales. Теперь менеджер должен только цену передачи: такие займы
// закрываем, а уже внесенные по ним деньги засчитываем в долг за товар
function closeLegacyResaleLoans() {
  const hasManagerSales = db
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'manager_sales'"
    )
    .get();
  if (!hasManagerSales) return;

  const toSeconds = (value: string) =>
    Date.parse(value.replace(" ", "T") + "Z") / 1000;
  const managers = db
    .prepare(
      `SELECT p.id as partner_id, u.id as user_id FROM partners p
       JOIN users u ON p.user_id = u.id WHERE u.role = 'manager'`
    )
    .all() as { partner_id: number; user_id: number }[];

  for (const manager of managers) {
    const loans = db
      .prepare(
        `SELECT id, amount, is_paid, created_at FROM loans
         WHERE partner_id = ? AND order_id IS NULL AND created_at IS NOT NULL
         ORDER BY id`
      )
      .all(manager.partner_id) as {
      id: number;
      amount: number;
      is_paid: number;
      created_at: string;
    }[];
    if (loans.length === 0) continue;
    const sales = db
      .prepare(
        `SELECT id, sale_price, created_at FROM manager_sales
         WHERE manager_id = ? AND created_at IS NOT NULL ORDER BY id`
      )
      .all(manager.user_id) as {
      id: number;
      sale_price: number;
      created_at: string;
    }[];

    // Каждой перепродаже соответствует один займ, созданный в ту же секунду
    const used = new Set<number>();
    let paidOnResaleCents = 0;
    for (const loan of loans) {
      const loanTime = toSeconds(loan.created_at);
      const match = sales
        .filter(
          (sale) =>
            !used.has(sale.id) &&
            Math.abs(toSeconds(sale.created_at) - loanTime) <= 2
        )
        .sort(
          (a, b) =>
            Math.abs(toSeconds(a.created_at) - loanTime) -
              Math.abs(toSeconds(b.created_at) - loanTime) ||
            Number(b.sale_price === loan.amount) -
              Number(a.sale_price === loan.amount)
        )[0];
      if (!match) continue;
      used.add(match.id);

      const originalCents = Math.round(match.sale_price * 100);
      const outstandingCents = loan.is_paid ? 0 : Math.round(loan.amount * 100);
      paidOnResaleCents += Math.max(0, originalCents - outstandingCents);
      db.prepare(
        `UPDATE loans SET kind = 'manager_debt', is_paid = true,
           description = COALESCE(description, 'Перепродажа: закрыто, менеджер должен только цену передачи')
         WHERE id = ?`
      ).run(loan.id);
    }

    // Деньги, уже внесенные по закрытым займам, гасят долг за товар (FIFO)
    const debts = db
      .prepare(
        `SELECT id, amount FROM loans
         WHERE partner_id = ? AND kind = 'manager_debt' AND is_paid = false
         ORDER BY created_at, id`
      )
      .all(manager.partner_id) as { id: number; amount: number }[];
    let creditCents = paidOnResaleCents;
    for (const debt of debts) {
      if (creditCents <= 0) break;
      const debtCents = Math.round(debt.amount * 100);
      if (creditCents >= debtCents) {
        db.prepare("UPDATE loans SET is_paid = true WHERE id = ?").run(debt.id);
        creditCents -= debtCents;
      } else {
        db.prepare("UPDATE loans SET amount = ? WHERE id = ?").run(
          (debtCents - creditCents) / 100,
          debt.id
        );
        creditCents = 0;
      }
    }
    if (used.size > 0) {
      console.log(
        `Менеджер ${manager.user_id}: закрыто займов за перепродажу: ${used.size}, зачтено в долг за товар: $${(
          (paidOnResaleCents - creditCents) /
          100
        ).toFixed(2)}`
      );
    }
  }
}

export function initDatabase() {
  // Каждый API-маршрут вызывает initDatabase при импорте — выполняем один раз
  if (isInitialized) return;
  isInitialized = true;

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
            status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'in_container', 'on_way', 'warehouse', 'sold', 'loan')),
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
    addColumnIfMissing(`ALTER TABLE partners ADD COLUMN name TEXT`);
  }

  if (!hasContactInfoColumn) {
    console.log("Добавляем колонку 'contact_info' в таблицу partners...");
    addColumnIfMissing(`ALTER TABLE partners ADD COLUMN contact_info TEXT`);
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
      status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'in_container', 'on_way', 'warehouse', 'sold', 'loan')),
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
      loan_date TEXT,
      description TEXT,
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

    const loanDateColumn = tableInfo.find((col) => col.name === "loan_date");
    const descriptionColumn = tableInfo.find(
      (col) => col.name === "description"
    );

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
          loan_date TEXT,
          description TEXT,
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
    } else {
      // Добавляем новые колонки если их нет
      if (!loanDateColumn) {
        console.log("Добавляем колонку 'loan_date' в таблицу loans...");
        addColumnIfMissing(`ALTER TABLE loans ADD COLUMN loan_date TEXT`);
      }

      if (!descriptionColumn) {
        console.log("Добавляем колонку 'description' в таблицу loans...");
        addColumnIfMissing(`ALTER TABLE loans ADD COLUMN description TEXT`);
      }
    }
  } catch (error) {
    console.log("Ошибка при проверке схемы loans:", error);
  }

  // Ремонт после старой миграции 'in_container': она переименовывала orders в
  // orders_old и удаляла ее, а SQLite при переименовании переписал внешние
  // ключи других таблиц на orders_old. В таких базах любая вставка продажи,
  // займа или долга поставщика с order_id падает с "no such table: orders_old".
  // Пересоздаем затронутые таблицы с исправленной схемой, сохраняя данные
  repairOrdersOldReferences();

  // Миграция: вид займа.
  //   partner_loan — деньги, полученные от партнера или администратора
  //                  (входят в баланс кассы, их нужно вернуть);
  //   manager_debt — долг менеджера за переданный ему товар (деньги еще не
  //                  получены, в баланс кассы не входят).
  // Выполняется в IMMEDIATE-транзакции с повторной проверкой колонки, чтобы
  // параллельные процессы сборки не провели пересчет долгов дважды
  db.transaction(() => {
    const loanColumns = db.pragma("table_info(loans)") as any[];
    if (loanColumns.some((col) => col.name === "kind")) return;

    console.log("Добавляем колонку 'kind' в таблицу loans...");
    db.exec(
      `ALTER TABLE loans ADD COLUMN kind TEXT NOT NULL DEFAULT 'partner_loan' CHECK (kind IN ('partner_loan', 'manager_debt'))`
    );
    // Займ менеджера с привязкой к заказу — это его долг за переданный товар
    const reclassified = db
      .prepare(
        `UPDATE loans SET kind = 'manager_debt'
         WHERE order_id IS NOT NULL AND partner_id IN (
           SELECT p.id FROM partners p JOIN users u ON p.user_id = u.id
           WHERE u.role = 'manager'
         )`
      )
      .run();
    console.log(`Займов менеджеров помечено как долг: ${reclassified.changes}`);
    closeLegacyResaleLoans();
  }).immediate();

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

  // Миграция: продажа менеджеру хранит id менеджера. Раньше менеджер
  // определялся только по buyer_name, поэтому переименование менеджера
  // «теряло» его товар, а однофамильцы видели чужой склад.
  // Существующие продажи связываем по долгу менеджера за тот же заказ
  const salesColumns = db.pragma("table_info(sales)") as any[];
  if (!salesColumns.some((col) => col.name === "manager_id")) {
    console.log("Добавляем колонку 'manager_id' в таблицу sales...");
    addColumnIfMissing(
      `ALTER TABLE sales ADD COLUMN manager_id INTEGER REFERENCES users (id)`
    );
    db.prepare(
      `UPDATE sales SET manager_id = (
         SELECT u.id FROM users u
         JOIN partners p ON p.user_id = u.id
         JOIN loans l ON l.partner_id = p.id AND l.order_id = sales.order_id
         WHERE u.role = 'manager' AND u.name = sales.buyer_name
         LIMIT 1
       )
       WHERE manager_id IS NULL`
    ).run();
    const linked = db
      .prepare("SELECT COUNT(*) as count FROM sales WHERE manager_id IS NOT NULL")
      .get() as { count: number };
    console.log(`Продажи, связанные с менеджерами: ${linked.count}`);
  }

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

  // Миграция для добавления статуса 'in_container' в таблицу orders
  try {
    // Проверяем существующий CHECK constraint
    const sql = db
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'"
      )
      .get() as any;

    if (sql && sql.sql && !sql.sql.includes("'in_container'")) {
      console.log("Миграция orders: добавляем статус 'in_container'...");

      // Получаем все данные
      const existingOrders = db.prepare("SELECT * FROM orders").all();

      // Отключаем foreign keys временно
      db.pragma("foreign_keys = OFF");

      // Переименовываем старую таблицу. legacy_alter_table: иначе SQLite
      // перепишет внешние ключи loans/sales/supplier_debts на orders_old,
      // которая ниже удаляется, и все вставки в эти таблицы начнут падать
      db.pragma("legacy_alter_table = ON");
      db.exec("ALTER TABLE orders RENAME TO orders_old");
      db.pragma("legacy_alter_table = OFF");

      // Создаем новую таблицу с обновленным CHECK constraint
      db.exec(`
        CREATE TABLE orders (
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
          status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'in_container', 'on_way', 'warehouse', 'sold', 'loan')),
          containers INTEGER,
          container_loads TEXT,
          transportation_cost REAL,
          customer_fee REAL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (supplier_id) REFERENCES suppliers (id),
          FOREIGN KEY (item_id) REFERENCES supplier_items (id)
        )
      `);

      // Восстанавливаем данные
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          id, order_number, supplier_id, item_id, date, description,
          measurement, value, price_per_unit, total_price, status,
          containers, container_loads, transportation_cost, customer_fee, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const order of existingOrders) {
        try {
          insertOrder.run(
            order.id,
            order.order_number,
            order.supplier_id,
            order.item_id,
            order.date,
            order.description,
            order.measurement,
            order.value,
            order.price_per_unit,
            order.total_price,
            order.status,
            order.containers,
            order.container_loads,
            order.transportation_cost,
            order.customer_fee,
            order.created_at
          );
        } catch (e) {
          console.log(`Ошибка восстановления заказа ${order.id}:`, e);
        }
      }

      // Удаляем старую таблицу
      db.exec("DROP TABLE orders_old");

      // Включаем foreign keys обратно
      db.pragma("foreign_keys = ON");

      console.log("Миграция orders завершена");
    }
  } catch (error) {
    console.log("Ошибка при миграции orders:", error);
  }

  // Миграция: операционные расходы заказа (погрузка и т. п.), добавленные
  // через add-expense. Нужны при оплате займа, чтобы не терять их: вычислять
  // их из total_price нельзя, если сумма заказа уменьшена долгом поставщика.
  // Колонку добавляем после пересоздания orders выше, иначе она потеряется.
  // Для заказов в займе расходы берем из уже записанных операций add-expense
  db.transaction(() => {
    const orderColumns = db.pragma("table_info(orders)") as any[];
    if (orderColumns.some((col) => col.name === "extra_costs")) return;
    db.exec(
      "ALTER TABLE orders ADD COLUMN extra_costs REAL NOT NULL DEFAULT 0"
    );
    db.prepare(
      `UPDATE orders SET extra_costs = COALESCE((
         SELECT SUM(e.amount) FROM expenses e
         WHERE e.type = 'order' AND e.related_id = orders.id AND e.amount > 0
           AND e.description NOT LIKE 'Оплата займа за заказ%'
       ), 0)
       WHERE status = 'loan'`
    ).run();
  }).immediate();

  // Создаем администратора по умолчанию.
  // INSERT OR IGNORE: несколько процессов сборки могут дойти сюда одновременно
  const adminExists = db
    .prepare("SELECT id FROM users WHERE username = 'admin'")
    .get();
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);

    const result = db
      .prepare(
        `
      INSERT OR IGNORE INTO users (username, password, role, name, email)
      VALUES ('admin', ?, 'admin', 'Администратор', 'admin@drevmaster.com')
    `
      )
      .run(hashedPassword);

    if (result.changes > 0) {
      console.log("Создан пользователь admin с паролем: admin123");
    }
  }
}

// Удаляет пользователя. Записи журнала остаются, но без привязки к нему.
// Возвращает false, если у пользователя есть финансовая история (займы,
// переводы, продажи) — такого пользователя можно только деактивировать
export function deleteUserIfNoHistory(userId: number): boolean {
  const remove = db.transaction(() => {
    db.prepare("UPDATE activity_logs SET user_id = NULL WHERE user_id = ?").run(
      userId
    );
    db.prepare(
      "DELETE FROM partners WHERE user_id = ? AND id NOT IN (SELECT partner_id FROM loans)"
    ).run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  try {
    remove();
    return true;
  } catch (e: any) {
    if (e?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") return false;
    throw e;
  }
}

// Экспортируем базу данных
export { db };
