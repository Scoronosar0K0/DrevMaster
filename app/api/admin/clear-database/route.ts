import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db } from "@/lib/database";
import { logActivity } from "@/lib/activity";
const bcrypt = require("bcryptjs");

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { password } = body;

    // Очистка доступна только администратору и подтверждается его паролем
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }
    const admin = db
      .prepare("SELECT password FROM users WHERE id = ?")
      .get(session.userId) as { password: string } | undefined;
    if (!password || !admin || !bcrypt.compareSync(password, admin.password)) {
      return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
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

      // Очищаем счетчики автоинкремента для таблиц с данными. Счетчик users
      // не сбрасываем: иначе новые пользователи получили бы id удаленных,
      // и чужие еще действующие токены открыли бы их данные
      const tableNames = tables.map((t) => `'${t}'`).join(", ");
      db.prepare(
        `UPDATE sqlite_sequence SET seq = 0 WHERE name IN (${tableNames})`
      ).run();

      // Создаем администратора с id 1 и тем же паролем, которым только что
      // подтвердили очистку (а не с известным паролем "admin"). Ошибку здесь
      // не глушим: без администратора в систему нельзя будет войти
      db.prepare(
        `
        INSERT INTO users (id, username, password, role, name, email, is_active)
        VALUES (1, 'admin', ?, 'admin', 'Администратор', 'admin@drevmaster.com', true)
      `
      ).run(admin.password);

      logActivity(
        1,
        "очистка_бд",
        "system",
        "База данных была полностью очищена и создан новый администратор"
      );
    });

    // Выполняем транзакцию
    transaction();

    // Выполняем VACUUM отдельно (вне транзакции)
    db.exec("VACUUM");

    // Включаем обратно проверку внешних ключей
    db.pragma("foreign_keys = ON");

    return NextResponse.json({
      success: true,
      message: "База данных очищена. Войдите как admin с вашим текущим паролем",
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
