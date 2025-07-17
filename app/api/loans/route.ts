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
        l.created_at,
        u.name as partner_name,
        o.order_number
      FROM loans l
      JOIN partners p ON l.partner_id = p.id
      JOIN users u ON p.user_id = u.id
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
    const { partner_id, amount, description } = body;

    if (!partner_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Партнер и сумма обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что партнер существует
    const partner = db
      .prepare("SELECT id FROM partners WHERE id = ?")
      .get(partner_id);
    if (!partner) {
      return NextResponse.json({ error: "Партнер не найден" }, { status: 404 });
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Создаем займ (без привязки к заказу)
      const insertLoan = db.prepare(`
        INSERT INTO loans (partner_id, amount, is_paid)
        VALUES (?, ?, false)
      `);
      insertLoan.run(partner_id, amount);

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'займ_взят', 'loan', ?)
      `);
      insertLog.run(`Займ на сумму $${amount} от партнера ID: ${partner_id}`);
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
