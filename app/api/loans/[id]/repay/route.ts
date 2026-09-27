import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
import { getCashBalance } from "@/lib/balance";
import { formatMoney } from "@/lib/format";

initDatabase();

const toCents = (value: number) => Math.round(Number(value) * 100);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

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

    // Считаем в центах, чтобы не оставались «хвосты» вроде $0.0000001
    const loanCents = toCents(loan.amount);
    let paymentCents = loanCents;
    if (isPartialPayment) {
      if (!(Number.isFinite(amount) && amount > 0)) {
        return NextResponse.json(
          { error: "Сумма частичной оплаты должна быть больше 0" },
          { status: 400 }
        );
      }
      paymentCents = toCents(amount);
      if (paymentCents > loanCents) {
        return NextResponse.json(
          { error: "Сумма оплаты не может превышать размер займа" },
          { status: 400 }
        );
      }
    }
    const payment = paymentCents / 100;
    const isManagerDebt = loan.kind === "manager_debt";

    // Возврат займа партнеру — деньги уходят из кассы, их должно хватать.
    // Погашение долга менеджера — деньги поступают, проверка не нужна
    if (!isManagerDebt) {
      const balance = getCashBalance();
      if (payment > balance + 1e-9) {
        return NextResponse.json(
          {
            error: `Недостаточно средств! Необходимо: ${formatMoney(
              payment
            )}, Доступно: ${formatMoney(balance)}`,
          },
          { status: 400 }
        );
      }
    }

    db.transaction(() => {
      const remainingCents = loanCents - paymentCents;

      if (remainingCents > 0) {
        // Частичное погашение - уменьшаем сумму займа
        const newAmount = remainingCents / 100;
        db.prepare("UPDATE loans SET amount = ? WHERE id = ?").run(
          newAmount,
          loanId
        );
        logActivity(
          session.userId,
          "займ_частично_погашен",
          "loan",
          `Частично погашен займ ${
            loan.partner_name || `ID: ${loan.partner_id}`
          }: оплачено $${payment}, остаток $${newAmount} (ID займа: ${loanId})`
        );
      } else {
        // Полное погашение - отмечаем займ как погашенный
        db.prepare("UPDATE loans SET is_paid = true WHERE id = ?").run(loanId);
        logActivity(
          session.userId,
          "займ_погашен",
          "loan",
          `Полностью погашен займ ${
            loan.partner_name || `ID: ${loan.partner_id}`
          } на сумму $${payment} (ID займа: ${loanId})`
        );
      }

      // Займ партнера: расход не создаем — погашенный займ сам выходит из
      // баланса (займы + поступления − расходы), иначе было бы двойное списание.
      // Долг менеджера в баланс не входит, поэтому полученные деньги
      // записываем как поступление (отрицательная сумма в expenses)
      if (isManagerDebt) {
        db.prepare(
          `INSERT INTO expenses (amount, description, type, related_id)
           VALUES (?, ?, 'other', ?)`
        ).run(
          -payment,
          `Погашение долга менеджера ${loan.partner_name || ""} - $${payment}`.trim(),
          loanId
        );
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка погашения займа:", error);
    return NextResponse.json(
      { error: "Ошибка погашения займа" },
      { status: 500 }
    );
  }
}
