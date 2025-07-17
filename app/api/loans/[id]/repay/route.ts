import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanId = parseInt(params.id);
    const body = await request.json();
    const { amount, isPartialPayment } = body;

    // Получаем информацию о займе
    const loan = db
      .prepare(
        `
      SELECT l.*, p.id as partner_id, u.name as partner_name
      FROM loans l
      JOIN partners p ON l.partner_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE l.id = ? AND l.is_paid = false
    `
      )
      .get(loanId) as any;

    if (!loan) {
      return NextResponse.json(
        { error: "Займ не найден или уже погашен" },
        { status: 404 }
      );
    }

    // Если частичная оплата, проверяем сумму
    if (isPartialPayment) {
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "Сумма частичной оплаты должна быть больше 0" },
          { status: 400 }
        );
      }

      if (amount > loan.amount) {
        return NextResponse.json(
          { error: "Сумма оплаты не может превышать размер займа" },
          { status: 400 }
        );
      }
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      if (isPartialPayment && amount < loan.amount) {
        // Частичное погашение - уменьшаем сумму займа
        const newAmount = loan.amount - amount;
        const updateLoan = db.prepare(`
          UPDATE loans SET amount = ? WHERE id = ?
        `);
        updateLoan.run(newAmount, loanId);

        // Логируем частичное погашение
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'займ_частично_погашен', 'loan', ?)
        `);
        insertLog.run(
          `Частично погашен займ ${
            loan.partner_name || `ID: ${loan.partner_id}`
          }: оплачено $${amount}, остаток $${newAmount} (ID займа: ${loanId})`
        );
      } else {
        // Полное погашение - отмечаем займ как погашенный
        const updateLoan = db.prepare(`
          UPDATE loans SET is_paid = true WHERE id = ?
        `);
        updateLoan.run(loanId);

        // Логируем полное погашение
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'займ_погашен', 'loan', ?)
        `);
        insertLog.run(
          `Полностью погашен займ ${
            loan.partner_name || `ID: ${loan.partner_id}`
          } на сумму $${loan.amount} (ID займа: ${loanId})`
        );
      }
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка погашения займа:", error);
    return NextResponse.json(
      { error: "Ошибка погашения займа" },
      { status: 500 }
    );
  }
}
