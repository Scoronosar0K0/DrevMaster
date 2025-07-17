const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log("Настройка базы данных DrevMaster...");

    // Сначала выполняем миграцию
    const migrate = require("./migrate-database");
    await migrate();

    // Создаем администратора по умолчанию
    const adminResult = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      ["admin"]
    );

    if (adminResult.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin", 10);

      await pool.query(
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

      console.log("✅ Создан пользователь admin с паролем: admin");
    } else {
      console.log("ℹ️  Пользователь admin уже существует");
    }

    // Создаем тестовые данные для демонстрации
    await createSampleData(pool);

    console.log("🎉 Настройка базы данных завершена!");
    console.log("📋 Данные для входа:");
    console.log("   Логин: admin");
    console.log("   Пароль: admin");
  } catch (error) {
    console.error("❌ Ошибка при настройке базы данных:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createSampleData(pool) {
  try {
    // Проверяем, есть ли уже тестовые данные
    const suppliersResult = await pool.query("SELECT COUNT(*) FROM suppliers");
    const suppliersCount = parseInt(suppliersResult.rows[0].count);

    if (suppliersCount === 0) {
      console.log("Создаем тестовые данные...");

      // Создаем тестового поставщика
      const supplierResult = await pool.query(
        `INSERT INTO suppliers (name, contact_person, phone, email, address, description)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          'ООО "Лесопромышленник"',
          "Иванов Иван Иванович",
          "+7 (495) 123-45-67",
          "info@wood-supplier.ru",
          "г. Москва, ул. Лесная, д. 10",
          "Поставщик высококачественной древесины",
        ]
      );
      const supplierId = supplierResult.rows[0].id;

      // Создаем тестовые товары
      const itemResult1 = await pool.query(
        `INSERT INTO supplier_items (supplier_id, name) VALUES ($1, $2) RETURNING id`,
        [supplierId, "Сосновая доска"]
      );

      const itemResult2 = await pool.query(
        `INSERT INTO supplier_items (supplier_id, name) VALUES ($1, $2) RETURNING id`,
        [supplierId, "Березовая фанера"]
      );

      // Создаем тестового партнера
      const hashedPassword = await bcrypt.hash("partner123", 10);
      const userResult = await pool.query(
        `INSERT INTO users (username, password, role, name, email, phone)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          "partner1",
          hashedPassword,
          "partner",
          "Петров Петр Петрович",
          "partner@example.com",
          "+7 (495) 987-65-43",
        ]
      );
      const userId = userResult.rows[0].id;

      await pool.query(
        `INSERT INTO partners (user_id, description)
         VALUES ($1, $2)`,
        [userId, "Постоянный партнер компании"]
      );

      console.log("✅ Тестовые данные созданы");
      console.log("📋 Тестовый партнер:");
      console.log("   Логин: partner1");
      console.log("   Пароль: partner123");
    } else {
      console.log("ℹ️  Тестовые данные уже существуют");
    }
  } catch (error) {
    console.error("⚠️  Ошибка создания тестовых данных:", error);
    // Не останавливаем процесс, если не удалось создать тестовые данные
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = setupDatabase;
