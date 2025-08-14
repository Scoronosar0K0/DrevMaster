import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
import { jwtVerify } from "jose";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "R2EYR5d7gdXup846"
);

export async function POST(request: NextRequest) {
  try {
    // Получаем токен из cookie
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Токен авторизации не найден" },
        { status: 401 }
      );
    }

    // Декодируем токен
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const userRole = payload.role as string;

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

    // Проверяем, что менеджер существует
    const manager = db
      .prepare(
        "SELECT * FROM users WHERE id = ? AND role = 'manager' AND is_active = true"
      )
      .get(manager_id) as any;

    if (!manager) {
      return NextResponse.json(
        { error: "Менеджер не найден или неактивен" },
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

      // Находим партнера менеджера для уменьшения его займа
      const managerPartner = db
        .prepare("SELECT id FROM partners WHERE user_id = ?")
        .get(manager_id) as any;

      if (managerPartner) {
        // Ищем активные займы менеджера для уменьшения
        const managerLoans = db
          .prepare(
            `
            SELECT * FROM loans 
            WHERE partner_id = ? AND is_paid = false 
            ORDER BY created_at ASC
          `
          )
          .all(managerPartner.id) as any[];

        let remainingAmount = amount;

        // Уменьшаем займы менеджера на сумму взятых денег
        for (const loan of managerLoans) {
          if (remainingAmount <= 0) break;

          if (loan.amount <= remainingAmount) {
            // Полностью погашаем этот займ
            db.prepare("UPDATE loans SET is_paid = true WHERE id = ?").run(
              loan.id
            );
            remainingAmount -= loan.amount;

            // Логируем погашение займа
            const insertPaymentLog = db.prepare(`
              INSERT INTO activity_logs (user_id, action, entity_type, details)
              VALUES (?, 'займ_погашен_админом', 'loan', ?)
            `);
            insertPaymentLog.run(
              userId,
              `Займ менеджера ${manager.name} на сумму $${loan.amount} погашен администратором`
            );
          } else {
            // Частично погашаем займ
            const newAmount = loan.amount - remainingAmount;
            db.prepare("UPDATE loans SET amount = ? WHERE id = ?").run(
              newAmount,
              loan.id
            );

            // Логируем частичное погашение
            const insertPaymentLog = db.prepare(`
              INSERT INTO activity_logs (user_id, action, entity_type, details)
              VALUES (?, 'займ_частично_погашен_админом', 'loan', ?)
            `);
            insertPaymentLog.run(
              userId,
              `Займ менеджера ${manager.name} частично погашен администратором на сумму $${remainingAmount}. Остаток: $${newAmount}`
            );
            remainingAmount = 0;
          }
        }

        // Если остались деньги после погашения всех займов, добавляем их в общий баланс
        if (remainingAmount > 0) {
          const insertLoan = db.prepare(`
            INSERT INTO loans (partner_id, amount, is_paid)
            VALUES (1, ?, false)
          `);
          insertLoan.run(remainingAmount);
        }
      }

      // Логируем активность взятия денег
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (?, 'взятие_денег_у_менеджера', 'manager', ?)
      `);
      insertLog.run(
        userId,
        `Администратор взял $${amount} у менеджера ${manager.name}. ${
          description || ""
        }`
      );
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
