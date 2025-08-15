import { NextResponse } from "next/server";
import { db } from "@/lib/database";
const bcrypt = require("bcryptjs");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    // Проверяем пароль
    if (password !== "Manuchehr1981") {
      return NextResponse.json(
        { error: "Неверный пароль" },
        { status: 401 }
      );
    }
    // Отключаем проверку внешних ключей для очистки
    db.pragma("foreign_keys = OFF");

    const transaction = db.transaction(() => {
      // Список всех таблиц для очистки (в порядке зависимостей)
      const tables = [
        "activity_logs",
        "manager_sales",
        "manager_transfers",
        "supplier_debts",
        "expenses",
        "sales",
        "loans",
        "orders",
        "supplier_items",
        "suppliers",
        "partners",
      ];

      // Удаляем все данные из таблиц (безопасно, игнорируем отсутствующие таблицы)
      tables.forEach((table) => {
        try {
          db.prepare(`DELETE FROM ${table}`).run();
          console.log(`Очищена таблица: ${table}`);
        } catch (e) {
          console.log(`Таблица ${table} не найдена или уже пуста`);
        }
      });

      // Удаляем ВСЕХ пользователей включая админа
      try {
        db.prepare("DELETE FROM users").run();
        console.log("Удалены все пользователи включая админа");
      } catch (e) {
        console.log("Ошибка при удалении пользователей:", e);
      }

      // Очищаем счетчики автоинкремента для всех таблиц
      try {
        const tableNames = tables.map((t) => `'${t}'`).join(", ");
        db.prepare(
          `UPDATE sqlite_sequence SET seq = 0 WHERE name IN (${tableNames})`
        ).run();
        db.prepare(
          "UPDATE sqlite_sequence SET seq = 0 WHERE name = 'users'"
        ).run();
        console.log("Очищены счетчики автоинкремента");
      } catch (e) {
        console.log("Ошибка при очистке счетчиков:", e);
      }

      // Создаем нового админа с паролем "admin"
      try {
        const hashedPassword = bcrypt.hashSync("admin", 10);
        db.prepare(`
          INSERT INTO users (username, password, role, name, email, is_active)
          VALUES ('admin', ?, 'admin', 'Администратор', 'admin@drevmaster.com', true)
        `).run(hashedPassword);
        console.log("Создан новый администратор с логином: admin, паролем: admin");
      } catch (e) {
        console.log("Ошибка при создании администратора:", e);
      }

      // Логируем очистку
      db.prepare(
        `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'очистка_бд', 'system', 'База данных была полностью очищена и создан новый администратор')
      `
      ).run();
    });

    // Выполняем транзакцию
    transaction();

    // Выполняем VACUUM отдельно (вне транзакции)
    db.exec("VACUUM");

    // Включаем обратно проверку внешних ключей
    db.pragma("foreign_keys = ON");

    return NextResponse.json({
      success: true,
      message: "База данных полностью очищена. Создан новый администратор. Логин: admin, Пароль: admin",
    });
  } catch (error) {
    // Включаем обратно проверку внешних ключей в случае ошибки
    db.pragma("foreign_keys = ON");

    console.error("Ошибка очистки базы данных:", error);
    return NextResponse.json(
      { error: "Ошибка очистки базы данных" },
      { status: 500 }
    );
  }
}
