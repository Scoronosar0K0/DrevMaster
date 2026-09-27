import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const managers = db
      .prepare(
        `
      SELECT 
        u.id,
        u.username,
        u.name,
        u.email,
        u.phone,
        u.is_active,
        u.created_at,
        COALESCE(debt.total_debt, 0) as debt
      FROM users u
      LEFT JOIN (
        SELECT 
          p.user_id,
          SUM(l.amount) as total_debt
        FROM partners p
        JOIN loans l ON p.id = l.partner_id
        WHERE l.is_paid = false AND l.kind = 'manager_debt'
        GROUP BY p.user_id
      ) debt ON u.id = debt.user_id
      WHERE u.role = 'manager'
      ORDER BY u.created_at DESC
    `
      )
      .all();

    return NextResponse.json(managers);
  } catch (error) {
    console.error("Ошибка получения менеджеров:", error);
    return NextResponse.json(
      { error: "Ошибка получения менеджеров" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { username, password, name, email, phone } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "Username, password и name обязательны" },
        { status: 400 }
      );
    }

    // Проверяем уникальность username
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким username уже существует" },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Создаем менеджера
    const result = db
      .prepare(
        `
      INSERT INTO users (username, password, role, name, email, phone, is_active)
      VALUES (?, ?, 'manager', ?, ?, ?, true)
    `
      )
      .run(username, hashedPassword, name, email || null, phone || null);

    // Логируем активность
    logActivity(session.userId, "создан", "manager", `Создан менеджер: ${name} (${username})`);

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("Ошибка создания менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка создания менеджера" },
      { status: 500 }
    );
  }
}
