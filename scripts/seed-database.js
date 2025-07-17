const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(process.cwd(), "drevmaster.db");
const db = new Database(dbPath);

// Включаем поддержку внешних ключей
db.pragma("foreign_keys = ON");

console.log("🚀 Заполняем базу данных тестовыми данными...");

try {
  // Создаем тестовых партнеров
  const hashedPassword = bcrypt.hashSync("password123", 10);

  // Партнер 1
  const user1 = db
    .prepare(
      `
    INSERT INTO users (username, password, role, name, email, phone)
    VALUES (?, ?, 'partner', ?, ?, ?)
  `
    )
    .run(
      "partner1",
      hashedPassword,
      "Иван Петров",
      "ivan@example.com",
      "+7-900-123-45-67"
    );

  db.prepare(
    `
    INSERT INTO partners (user_id, balance, description)
    VALUES (?, ?, ?)
  `
  ).run(user1.lastInsertRowid, 50000, "Инвестор из Москвы");

  // Партнер 2
  const user2 = db
    .prepare(
      `
    INSERT INTO users (username, password, role, name, email, phone)
    VALUES (?, ?, 'partner', ?, ?, ?)
  `
    )
    .run(
      "partner2",
      hashedPassword,
      "Елена Сидорова",
      "elena@example.com",
      "+7-900-234-56-78"
    );

  db.prepare(
    `
    INSERT INTO partners (user_id, balance, description)
    VALUES (?, ?, ?)
  `
  ).run(user2.lastInsertRowid, 75000, "Инвестор из СПб");

  console.log("✅ Партнеры созданы");

  // Создаем тестовых поставщиков
  const supplier1 = db
    .prepare(
      `
    INSERT INTO suppliers (name, contact_person, phone, email, address, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      'ООО "Лесопромышленник"',
      "Алексей Смирнов",
      "+7-495-123-45-67",
      "info@lesoprom.ru",
      "г. Архангельск, ул. Лесная, 15",
      "Поставщик качественной древесины из северных регионов"
    );

  const supplier2 = db
    .prepare(
      `
    INSERT INTO suppliers (name, contact_person, phone, email, address, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      'ЗАО "Сибирский лес"',
      "Михаил Кузнецов",
      "+7-383-234-56-78",
      "orders@sibirles.ru",
      "г. Новосибирск, пр. Лесной, 42",
      "Экспорт древесины высшего качества"
    );

  console.log("✅ Поставщики созданы");

  // Добавляем товары для поставщиков
  const items1 = [
    "Брус 150x150x6000",
    "Доска обрезная 50x150x6000",
    "Вагонка липа",
    "Блок-хаус сосна",
    "Половая доска",
  ];

  const items2 = [
    "Брус клееный 200x200x6000",
    "OSB-3 плита 18мм",
    "Фанера березовая 18мм",
    "Брусок строительный 50x50x3000",
    "Рейка 20x40x3000",
  ];

  items1.forEach((item) => {
    db.prepare(
      `
      INSERT INTO supplier_items (supplier_id, name)
      VALUES (?, ?)
    `
    ).run(supplier1.lastInsertRowid, item);
  });

  items2.forEach((item) => {
    db.prepare(
      `
      INSERT INTO supplier_items (supplier_id, name)
      VALUES (?, ?)
    `
    ).run(supplier2.lastInsertRowid, item);
  });

  console.log("✅ Товары поставщиков добавлены");

  // Создаем тестовые заказы
  const date = new Date().toISOString().split("T")[0];

  const order1 = db
    .prepare(
      `
    INSERT INTO orders (
      order_number, supplier_id, item_id, date, description, 
      measurement, value, price_per_unit, total_price, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      "ORD-241225-001",
      supplier1.lastInsertRowid,
      1, // Брус 150x150x6000
      date,
      "Тестовый заказ для демонстрации системы",
      "куб.м",
      25.5,
      450,
      11475,
      "warehouse"
    );

  const order2 = db
    .prepare(
      `
    INSERT INTO orders (
      order_number, supplier_id, item_id, date, description, 
      measurement, value, price_per_unit, total_price, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      "ORD-241225-002",
      supplier2.lastInsertRowid,
      6, // Брус клееный 200x200x6000
      date,
      "Заказ клееного бруса для строительства",
      "куб.м",
      15.0,
      850,
      12750,
      "on_way"
    );

  console.log("✅ Тестовые заказы созданы");

  // Создаем тестовые займы
  db.prepare(
    `
    INSERT INTO loans (partner_id, order_id, amount, is_paid)
    VALUES (?, ?, ?, ?)
  `
  ).run(1, order1.lastInsertRowid, 8000, false);

  db.prepare(
    `
    INSERT INTO loans (partner_id, order_id, amount, is_paid)
    VALUES (?, ?, ?, ?)
  `
  ).run(2, order2.lastInsertRowid, 10000, false);

  console.log("✅ Займы созданы");

  // Обновляем балансы партнеров
  db.prepare(`UPDATE partners SET balance = balance - 8000 WHERE id = 1`).run();
  db.prepare(
    `UPDATE partners SET balance = balance - 10000 WHERE id = 2`
  ).run();

  console.log("✅ Балансы партнеров обновлены");

  // Добавляем записи в лог активности
  const logs = [
    [1, "создан", "partner", 1, "Создан партнер: Иван Петров"],
    [1, "создан", "partner", 2, "Создан партнер: Елена Сидорова"],
    [
      1,
      "создан",
      "supplier",
      supplier1.lastInsertRowid,
      'Создан поставщик: ООО "Лесопромышленник"',
    ],
    [
      1,
      "создан",
      "supplier",
      supplier2.lastInsertRowid,
      'Создан поставщик: ЗАО "Сибирский лес"',
    ],
    [
      1,
      "заказ_создан",
      "order",
      order1.lastInsertRowid,
      "Создан заказ ORD-241225-001",
    ],
    [
      1,
      "заказ_создан",
      "order",
      order2.lastInsertRowid,
      "Создан заказ ORD-241225-002",
    ],
    [1, "займ_взят", "loan", 1, "Займ на сумму $8000 от партнера Иван Петров"],
    [
      1,
      "займ_взят",
      "loan",
      2,
      "Займ на сумму $10000 от партнера Елена Сидорова",
    ],
  ];

  logs.forEach(([user_id, action, entity_type, entity_id, details]) => {
    db.prepare(
      `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(user_id, action, entity_type, entity_id, details);
  });

  console.log("✅ История активности добавлена");

  console.log("\n🎉 База данных успешно заполнена тестовыми данными!");
  console.log("\n📋 Данные для входа:");
  console.log("👤 Администратор: admin / admin");
  console.log("👤 Партнер 1: partner1 / password123");
  console.log("👤 Партнер 2: partner2 / password123");
  console.log("\n🌐 Откройте http://localhost:3000 для работы с системой");
} catch (error) {
  console.error("❌ Ошибка при заполнении базы данных:", error);
} finally {
  db.close();
}
