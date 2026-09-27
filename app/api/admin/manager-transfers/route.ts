import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { getOutstandingFor, payDownLoans } from "@/lib/balance";
import { formatMoney } from "@/lib/format";

initDatabase();

// Ошибка проверки при одобрении: откатывает транзакцию и возвращается как 400
class ApprovalError extends Error {}

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const userRole = session.role;

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
        const transfer = db
          .prepare(`
            SELECT t.*, u.name as manager_name, r.role as recipient_role, r.name as recipient_name
            FROM manager_transfers t
            JOIN users u ON t.from_manager_id = u.id
            JOIN users r ON t.to_user_id = r.id
            WHERE t.id = ?
          `)
          .get(id) as any;

        if (transfer) {
          if (transfer.recipient_role === "partner") {
            // Менеджер заплатил партнеру от имени компании: уменьшаем и долг
            // менеджера, и наш займ у партнера. Касса при этом не меняется:
            // займ партнера выходит из баланса, поступление ниже его компенсирует
            const partnerOwed = getOutstandingFor(transfer.to_user_id, "partner_loan");
            if (partnerOwed + 0.005 < transfer.amount) {
              throw new ApprovalError(
                `У партнера ${transfer.recipient_name} непогашенных займов только на ${formatMoney(
                  partnerOwed
                )}. Отклоните перевод или уточните сумму`
              );
            }
            payDownLoans(transfer.to_user_id, "partner_loan", transfer.amount);
          }

          payDownLoans(transfer.from_manager_id, "manager_debt", transfer.amount);

          // Деньги от менеджера — поступление в кассу
          db.prepare(`
            INSERT INTO expenses (amount, description, type, related_id)
            VALUES (?, ?, 'other', ?)
          `).run(
            -transfer.amount, // Отрицательная сумма = доход
            transfer.recipient_role === "partner"
              ? `Перевод менеджера ${transfer.manager_name} партнеру ${transfer.recipient_name} в счет займа - $${transfer.amount}`
              : `Получен перевод от менеджера ${transfer.manager_name} - $${transfer.amount}`,
            transfer.id
          );
        }
      }
      return true;
    });

    let decided: boolean;
    try {
      decided = applyDecision();
    } catch (error) {
      if (error instanceof ApprovalError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    if (!decided) {
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

    logActivity(session.userId, "обработка_перевода", "transfer", `${status === "approved" ? "Одобрен" : "Отклонен"} перевод от ${
        transfer.manager_name
      } на сумму $${transfer.amount}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обработки перевода:", error);
    return NextResponse.json(
      { error: "Ошибка обработки перевода" },
      { status: 500 }
    );
  }
}
