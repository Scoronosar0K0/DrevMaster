import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const userId = session.userId;
    const userRole = session.role;

    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    const transfers = db
      .prepare(
        `
        SELECT 
          t.id,
          t.to_user_id,
          u.name as to_user_name,
          t.amount,
          t.description,
          t.status,
          t.created_at
        FROM manager_transfers t
        JOIN users u ON t.to_user_id = u.id
        WHERE t.from_manager_id = ?
        ORDER BY t.created_at DESC
      `
      )
      .all(userId);

    return NextResponse.json(transfers);
  } catch (error) {
    console.error("Ошибка получения переводов менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка получения переводов" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const userId = session.userId;
    const userRole = session.role;

    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to_user_id, amount, description } = body;

    if (!to_user_id || !(Number.isFinite(amount) && amount > 0)) {
      return NextResponse.json(
        { error: "Получатель и сумма обязательны" },
        { status: 400 }
      );
    }

    // Получатель — администратор (деньги в кассу) или активный партнер
    // (менеджер заплатил партнеру в счет его займа)
    const recipient = db
      .prepare(
        "SELECT id, name FROM users WHERE id = ? AND is_active = true AND role IN ('admin', 'partner')"
      )
      .get(to_user_id);
    if (!recipient) {
      return NextResponse.json(
        { error: "Получатель не найден" },
        { status: 404 }
      );
    }

    // Создаем заявку на перевод
    const insertTransfer = db.prepare(`
      INSERT INTO manager_transfers (from_manager_id, to_user_id, amount, description, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    const result = insertTransfer.run(
      userId,
      to_user_id,
      amount,
      description || null
    );

    // Логируем активность
    logActivity(session.userId, "заявка_на_перевод", "transfer", `Создана заявка на перевод $${amount} пользователю ${
        (recipient as any).name
      }`);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Ошибка создания перевода менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка создания перевода" },
      { status: 500 }
    );
  }
}
