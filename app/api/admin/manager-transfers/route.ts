import { NextRequest, NextResponse } from "next/server";
import { getJwtSecret } from "@/lib/auth";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(request: NextRequest) {
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
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userRole = payload.role as string;

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Доступ только для администраторов" },
        { status: 403 }
      );
    }

    // Получаем все переводы менеджеров
    const transfers = db
      .prepare(
        `
        SELECT 
          t.id,
          t.from_manager_id,
          uf.name as from_manager_name,
          uf.username as from_manager_username,
          t.to_user_id,
          ut.name as to_user_name,
          t.amount,
          t.description,
          t.status,
          t.created_at,
          t.approved_by,
          ua.name as approved_by_name,
          t.approved_at
        FROM manager_transfers t
        JOIN users uf ON t.from_manager_id = uf.id
        JOIN users ut ON t.to_user_id = ut.id
        LEFT JOIN users ua ON t.approved_by = ua.id
        ORDER BY 
          CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
          t.created_at DESC
      `
      )
      .all();

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Ошибка получения переводов для админа:", error);
    return NextResponse.json(
      { error: "Ошибка получения переводов" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { payload } = await jwtVerify(token, getJwtSecret());
    const userId = payload.userId as number;
    const userRole = payload.role as string;

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Доступ только для администраторов" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "ID и корректный статус обязательны" },
        { status: 400 }
      );
    }

    // Обновляем статус перевода
    const updateTransfer = db.prepare(`
      UPDATE manager_transfers 
      SET status = ?, approved_by = ?, approved_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `);

    // Статус, погашение долга и доход записываются атомарно
    const applyDecision = db.transaction((): boolean => {
      const result = updateTransfer.run(status, userId, id);
      if (result.changes === 0) return false;

      // Если перевод одобрен, уменьшаем долг менеджера
      if (status === "approved") {
        // Получаем данные перевода с именем менеджера
        const transfer = db
          .prepare(`
            SELECT t.*, u.name as manager_name 
            FROM manager_transfers t
            JOIN users u ON t.from_manager_id = u.id
            WHERE t.id = ?
          `)
          .get(id) as any;

        if (transfer) {
          // Находим партнера менеджера
          const managerPartner = db
            .prepare("SELECT id FROM partners WHERE user_id = ?")
            .get(transfer.from_manager_id) as any;

          if (managerPartner) {
            // Ищем активные займы менеджера для уменьшения
            const managerLoans = db
              .prepare(
                `SELECT * FROM loans 
                 WHERE partner_id = ? AND is_paid = false 
                 ORDER BY created_at ASC`
              )
              .all(managerPartner.id) as any[];

            let remainingAmount = transfer.amount;

            // Уменьшаем займы менеджера на сумму перевода
            for (const loan of managerLoans) {
              if (remainingAmount <= 0) break;

              if (loan.amount <= remainingAmount) {
                // Полностью погашаем этот займ
                db.prepare("UPDATE loans SET is_paid = true WHERE id = ?").run(loan.id);
                remainingAmount -= loan.amount;
              } else {
                // Частично уменьшаем займ
                db.prepare("UPDATE loans SET amount = amount - ? WHERE id = ?").run(
                  remainingAmount,
                  loan.id
                );
                remainingAmount = 0;
              }
            }
          }

          // Добавляем доход админу от принятого перевода
          const insertIncome = db.prepare(`
            INSERT INTO expenses (amount, description, type, related_id, created_at)
            VALUES (?, ?, 'other', ?, datetime('now'))
          `);
          insertIncome.run(
            -transfer.amount, // Отрицательная сумма = доход
            `Получен перевод от менеджера ${transfer.manager_name} - $${transfer.amount}`,
            transfer.id
          );
        }
      }
      return true;
    });

    if (!applyDecision()) {
      return NextResponse.json(
        { error: "Перевод не найден или уже обработан" },
        { status: 404 }
      );
    }

    // Логируем активность
    const transfer = db
      .prepare(
        `
        SELECT t.*, u.name as manager_name 
        FROM manager_transfers t
        JOIN users u ON t.from_manager_id = u.id
        WHERE t.id = ?
      `
      )
      .get(id) as any;

    const insertLog = db.prepare(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES (?, 'обработка_перевода', 'transfer', ?)
    `);
    insertLog.run(
      userId,
      `${status === "approved" ? "Одобрен" : "Отклонен"} перевод от ${
        transfer.manager_name
      } на сумму $${transfer.amount}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обработки перевода:", error);
    return NextResponse.json(
      { error: "Ошибка обработки перевода" },
      { status: 500 }
    );
  }
}
