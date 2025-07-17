import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function GET() {
  try {
    const users = db
      .prepare(
        `
      SELECT id, username, role, name, email, phone, is_active, created_at
      FROM users 
      ORDER BY created_at DESC
    `
      )
      .all();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Ошибка получения пользователей:", error);
    return NextResponse.json(
      { error: "Ошибка получения пользователей" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, role, name, email, phone } = body;

    if (!username || !password || !role || !name) {
      return NextResponse.json(
        { error: "Логин, пароль, роль и имя обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь с таким логином не существует
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким логином уже существует" },
        { status: 400 }
      );
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const insert = db.prepare(`
      INSERT INTO users (username, password, role, name, email, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      username,
      hashedPassword,
      role,
      name,
      email || null,
      phone || null
    );

    // Если создаем партнера, также создаем запись в таблице partners
    if (role === "partner") {
      const insertPartner = db.prepare(`
        INSERT INTO partners (user_id, description)
        VALUES (?, ?)
      `);
      insertPartner.run(result.lastInsertRowid, `Партнер: ${name}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка создания пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка создания пользователя" },
      { status: 500 }
    );
  }
}
