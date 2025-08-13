import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Логин и пароль обязательны" },
        { status: 400 }
      );
    }

    // Проверяем пользователя в базе данных
    const user = db
      .prepare(
        `
        SELECT u.*, p.id as partner_id 
        FROM users u 
        LEFT JOIN partners p ON u.id = p.user_id 
        WHERE u.username = ? AND u.is_active = true
      `
      )
      .get(username) as any;

    if (!user) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    // Создаем JWT токен
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      partnerId: user.partner_id || null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    // Логируем вход
    try {
      db.prepare(
        `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (?, 'вход', 'auth', ?)
      `
      ).run(user.id, `Пользователь ${user.username} вошел в систему`);
    } catch (e) {
      console.log("Не удалось записать в лог");
    }

    // Возвращаем токен и информацию о пользователе
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        partnerId: user.partner_id || null,
      },
    });

    // Устанавливаем cookie с токеном
    response.cookies.set("auth-token", token, {
      httpOnly: true, // Возвращаем обратно для безопасности
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 дней
    });

    return response;
  } catch (error) {
    console.error("Ошибка входа:", error);
    return NextResponse.json(
      { error: "Ошибка входа в систему" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });

    // Удаляем cookie
    response.cookies.delete("auth-token");

    return response;
  } catch (error) {
    console.error("Ошибка выхода:", error);
    return NextResponse.json({ error: "Ошибка выхода" }, { status: 500 });
  }
}
