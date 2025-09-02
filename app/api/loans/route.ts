import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET() {
  try {
    const loans = db
      .prepare(
        `
      SELECT 
        l.id,
        l.partner_id,
        l.amount,
        l.order_id,
        l.is_paid,
        l.loan_date,
        l.description,
        l.created_at,
        CASE 
          WHEN l.partner_id = 0 THEN 'Администратор'
          ELSE u.name 
        END as partner_name,
        o.order_number
      FROM loans l
      LEFT JOIN partners p ON l.partner_id = p.id AND l.partner_id != 0
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN orders o ON l.order_id = o.id
      ORDER BY l.created_at DESC
    `
      )
      .all();

    return NextResponse.json(loans);
  } catch (error) {
    console.error("Ошибка получения займов:", error);
    return NextResponse.json(
      { error: "Ошибка получения займов" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partner_id, amount, description, loan_date, from_admin } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Сумма обязательна и должна быть больше 0" },
        { status: 400 }
      );
    }

    if (!from_admin && !partner_id) {
      return NextResponse.json(
        { error: "Выберите партнера или администратора" },
        { status: 400 }
      );
    }

    // Если займ от админа, используем специальный partner_id = 0
    let finalPartnerId = partner_id;
    if (from_admin) {
      finalPartnerId = 0; // Специальный ID для админа
    } else {
      // Проверяем, что партнер существует
      const partner = db
        .prepare("SELECT id FROM partners WHERE id = ?")
        .get(partner_id);
      if (!partner) {
        return NextResponse.json(
          { error: "Партнер не найден" },
          { status: 404 }
        );
      }
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Создаем займ
      const insertLoan = db.prepare(`
        INSERT INTO loans (partner_id, amount, loan_date, description, is_paid)
        VALUES (?, ?, ?, ?, false)
      `);
      insertLoan.run(
        finalPartnerId,
        amount,
        loan_date || null,
        description || null
      );

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'займ_взят', 'loan', ?)
      `);
      const loanSource = from_admin
        ? "администратора"
        : `партнера ID: ${partner_id}`;
      insertLog.run(
        `Займ на сумму $${amount} от ${loanSource}${
          description ? ` (${description})` : ""
        }`
      );
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка создания займа:", error);
    return NextResponse.json(
      { error: "Ошибка создания займа" },
      { status: 500 }
    );
  }
}
