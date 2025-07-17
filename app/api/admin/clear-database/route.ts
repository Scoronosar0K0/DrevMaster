import { NextResponse } from "next/server";
import { db } from "@/lib/database";

export async function POST() {
  try {
    // Отключаем проверку внешних ключей для очистки
    db.pragma("foreign_keys = OFF");

    const transaction = db.transaction(() => {
      // Удаляем все данные в правильном порядке
      db.prepare("DELETE FROM activity_logs").run();
      db.prepare("DELETE FROM sales").run();
      db.prepare("DELETE FROM loans").run();
      db.prepare("DELETE FROM orders").run();
      db.prepare("DELETE FROM supplier_items").run();
      db.prepare("DELETE FROM suppliers").run();
      db.prepare("DELETE FROM partners").run();

      // Удаляем всех пользователей кроме админа
      db.prepare("DELETE FROM users WHERE username != 'admin'").run();

      // Очищаем счетчики автоинкремента
      db.prepare(
        "UPDATE sqlite_sequence SET seq = 0 WHERE name IN ('activity_logs', 'sales', 'loans', 'orders', 'supplier_items', 'suppliers', 'partners')"
      ).run();
      db.prepare(
        "UPDATE sqlite_sequence SET seq = 1 WHERE name = 'users'"
      ).run();

      // Логируем очистку
      db.prepare(
        `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'очистка_бд', 'system', 'База данных была полностью очищена')
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
      message: "База данных успешно очищена. Остался только администратор.",
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
