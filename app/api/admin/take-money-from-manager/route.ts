import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { payDownLoans } from "@/lib/balance";

initDatabase();

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const userId = session.userId;
    const userRole = session.role;

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Доступ только для администраторов" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { manager_id, amount, description } = body;

    if (!manager_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "ID менеджера и корректная сумма обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что менеджер существует. Деактивированный менеджер тоже
    // подходит: его долг все равно нужно собрать
    const manager = db
      .prepare("SELECT * FROM users WHERE id = ? AND role = 'manager'")
      .get(manager_id) as any;

    if (!manager) {
      return NextResponse.json(
        { error: "Менеджер не найден" },
        { status: 404 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Создаем перевод от менеджера администратору
      const insertTransfer = db.prepare(`
        INSERT INTO manager_transfers (from_manager_id, to_user_id, amount, description, status, approved_by, approved_at)
        VALUES (?, ?, ?, ?, 'approved', ?, datetime('now'))
      `);

      insertTransfer.run(
        manager_id,
        userId, // администратор
        amount,
        description || "Взятие денег администратором",
        userId // администратор сам одобрил
      );

      // Гасим долги менеджера за товар, начиная с самых старых (в центах)
      for (const step of payDownLoans(manager_id, "manager_debt", amount)) {
        if (step.remaining === 0) {
          logActivity(session.userId, "займ_погашен_админом", "loan", `Займ менеджера ${manager.name} на сумму $${step.paid} погашен администратором`);
        } else {
          logActivity(session.userId, "займ_частично_погашен_админом", "loan", `Займ менеджера ${manager.name} частично погашен администратором на сумму $${step.paid}. Остаток: $${step.remaining}`);
        }
      }

      // Полученные деньги — доход кассы (как при одобрении перевода менеджера).
      // Сумма сверх долга менеджера тоже учитывается здесь как доход
      db.prepare(
        `
        INSERT INTO expenses (amount, description, type, related_id)
        VALUES (?, ?, 'other', ?)
      `
      ).run(
        -amount, // Отрицательная сумма = доход
        `Получены деньги от менеджера ${manager.name} - $${amount}`,
        manager_id
      );

      // Логируем активность взятия денег
      logActivity(session.userId, "взятие_денег_у_менеджера", "manager", `Администратор взял $${amount} у менеджера ${manager.name}. ${
          description || ""
        }`);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка взятия денег у менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка взятия денег у менеджера" },
      { status: 500 }
    );
  }
}
