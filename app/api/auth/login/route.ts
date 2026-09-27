import { NextRequest, NextResponse } from "next/server";
import { getJwtSecret } from "@/lib/auth";
import { db, initDatabase } from "@/lib/database";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

initDatabase();

// Ограничение перебора паролей: не больше 10 неудачных попыток за 15 минут
// для пары «IP + логин» (в памяти процесса — приложение работает в одном процессе)
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

// Сравнение с фиктивным хешем, чтобы ответ для несуществующего логина занимал
// столько же времени, сколько для неверного пароля (не выдаем, какие логины есть)
const DUMMY_HASH = bcrypt.hashSync("drevmaster-timing-dummy", 10);

function throttleKey(request: NextRequest, username: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  return `${ip}|${String(username).toLowerCase()}`;
}

function isThrottled(key: string) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) {
    failures.set(key, { count: 1, since: Date.now() });
  } else {
    entry.count += 1;
  }
}

// Cookie с флагом Secure браузер примет только по HTTPS. Сервер из deploy.sh
// работает по HTTP, поэтому флаг ставим по фактическому протоколу запроса
// (nginx передает X-Forwarded-Proto). COOKIE_SECURE=true|false переопределяет
function isSecureRequest(request: NextRequest) {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === "true";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  return proto.split(",")[0].trim() === "https";
}

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

    const key = throttleKey(request, username);
    if (isThrottled(key)) {
      return NextResponse.json(
        { error: "Слишком много неудачных попыток входа. Попробуйте через 15 минут" },
        { status: 429 }
      );
    }

    // Проверяем пользователя в базе данных
    const user = db
      .prepare(
        `
        SELECT u.*, p.id as partner_id 
        FROM users u 
        LEFT JOIN partners p ON u.id = p.user_id AND p.id != 0
        WHERE u.username = ? AND u.is_active = true
      `
      )
      .get(username) as any;

    // Проверяем пароль (для несуществующего логина — с фиктивным хешем)
    const isPasswordValid = bcrypt.compareSync(
      password,
      user ? user.password : DUMMY_HASH
    );
    if (!user || !isPasswordValid) {
      recordFailure(key);
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }
    failures.delete(key);

    // Создаем JWT токен
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      partnerId: user.partner_id || null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(getJwtSecret());

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
      secure: isSecureRequest(request),
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
