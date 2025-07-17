import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
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

    const result = updateTransfer.run(status, userId, id);

    if (result.changes === 0) {
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
