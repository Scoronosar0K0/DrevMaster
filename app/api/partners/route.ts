import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function GET() {
  try {
    const partners = db
      .prepare(
        `
      SELECT 
        p.id,
        u.name,
        u.username,
        u.email,
        u.phone,
        p.description,
        p.created_at
      FROM partners p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true
      ORDER BY p.created_at DESC
    `
      )
      .all();

    return NextResponse.json(partners);
  } catch (error) {
    console.error("Ошибка получения партнеров:", error);
    return NextResponse.json(
      { error: "Ошибка получения партнеров" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, email, phone, description, password } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Имя, логин и пароль обязательны" },
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

    // Создаем пользователя
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, name, email, phone)
      VALUES (?, ?, 'partner', ?, ?, ?)
    `);
    const userResult = insertUser.run(
      username,
      hashedPassword,
      name,
      email || null,
      phone || null
    );

    // Создаем партнера
    const insertPartner = db.prepare(`
      INSERT INTO partners (user_id, description)
      VALUES (?, ?)
    `);
    insertPartner.run(userResult.lastInsertRowid, description || null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка создания партнера:", error);
    return NextResponse.json(
      { error: "Ошибка создания партнера" },
      { status: 500 }
    );
  }
}
