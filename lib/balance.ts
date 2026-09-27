import { db } from "@/lib/database";

// Баланс кассы = непогашенные займы партнеров и администратора (деньги,
// которые мы получили) + поступления − расходы. Поступления хранятся в
// expenses с отрицательной суммой.
//
// Долг менеджеров за товар (loans.kind = 'manager_debt') в баланс не входит:
// это деньги, которые еще не поступили. В кассу они попадают как поступление,
// когда менеджер платит (одобренный перевод, взятие денег администратором или
// погашение долга в кассе).
export function getCashBalance(): number {
  const loans = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM loans
       WHERE is_paid = false AND kind = 'partner_loan'`
    )
    .get() as { total: number };

  const expenses = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE amount > 0"
    )
    .get() as { total: number };

  const income = db
    .prepare(
      "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM expenses WHERE amount < 0"
    )
    .get() as { total: number };

  return loans.total + income.total - expenses.total;
}

// Непогашенные суммы по видам займов: сколько мы должны партнерам и сколько
// нам должны менеджеры
export function getOutstandingLoans(): {
  partnerLoans: number;
  managerDebt: number;
} {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'partner_loan' THEN amount ELSE 0 END), 0) as partner_loans,
         COALESCE(SUM(CASE WHEN kind = 'manager_debt' THEN amount ELSE 0 END), 0) as manager_debt
       FROM loans WHERE is_paid = false`
    )
    .get() as { partner_loans: number; manager_debt: number };
  return { partnerLoans: row.partner_loans, managerDebt: row.manager_debt };
}

type LoanKind = "partner_loan" | "manager_debt";

// Непогашенная сумма займов вида kind на партнерской записи пользователя
export function getOutstandingFor(userId: number, kind: LoanKind): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(l.amount), 0) as total
       FROM loans l JOIN partners p ON p.id = l.partner_id
       WHERE p.user_id = ? AND p.id != 0 AND l.kind = ? AND l.is_paid = false`
    )
    .get(userId, kind) as { total: number };
  return row.total;
}

// Гасит займы вида kind на партнерской записи пользователя на сумму amount,
// начиная с самых старых. Считает в центах, чтобы не оставлять «хвостов»
// вроде $0.0000000001. Возвращает погашенные займы (для журнала).
// Вызывать внутри db.transaction вместе с записью поступления
export function payDownLoans(
  userId: number,
  kind: LoanKind,
  amount: number
): { loanId: number; paid: number; remaining: number }[] {
  let remainingCents = Math.round(amount * 100);
  const loans = db
    .prepare(
      `SELECT l.id, l.amount FROM loans l JOIN partners p ON p.id = l.partner_id
       WHERE p.user_id = ? AND p.id != 0 AND l.kind = ? AND l.is_paid = false
       ORDER BY l.created_at ASC, l.id ASC`
    )
    .all(userId, kind) as { id: number; amount: number }[];

  const steps: { loanId: number; paid: number; remaining: number }[] = [];
  for (const loan of loans) {
    if (remainingCents <= 0) break;
    const loanCents = Math.round(loan.amount * 100);
    if (loanCents <= remainingCents) {
      db.prepare("UPDATE loans SET is_paid = true WHERE id = ?").run(loan.id);
      remainingCents -= loanCents;
      steps.push({ loanId: loan.id, paid: loanCents / 100, remaining: 0 });
    } else {
      const left = (loanCents - remainingCents) / 100;
      db.prepare("UPDATE loans SET amount = ? WHERE id = ?").run(left, loan.id);
      steps.push({ loanId: loan.id, paid: remainingCents / 100, remaining: left });
      remainingCents = 0;
    }
  }
  return steps;
}
