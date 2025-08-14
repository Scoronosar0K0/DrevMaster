import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "R2EYR5d7gdXup846"
);

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
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const userRole = payload.role as string;

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

    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to_user_id, amount, description } = body;

    if (!to_user_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Получатель и сумма обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что получатель существует
    const recipient = db
      .prepare("SELECT id, name FROM users WHERE id = ?")
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
    const insertLog = db.prepare(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES (?, 'заявка_на_перевод', 'transfer', ?)
    `);
    insertLog.run(
      userId,
      `Создана заявка на перевод $${amount} пользователю ${
        (recipient as any).name
      }`
    );

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
