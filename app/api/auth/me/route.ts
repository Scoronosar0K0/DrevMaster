import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(request: NextRequest) {
  // 401, если пользователь удален, деактивирован или сменил роль —
  // клиент по этому ответу завершает сессию
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    // Имя и контакты берем из базы: в токене их нет, и они могут меняться
    const user = db
      .prepare(
        "SELECT id, username, name, email, phone, role FROM users WHERE id = ?"
      )
      .get(session.userId) as any;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        partnerId: session.partnerId,
      },
    });
  } catch (error) {
    console.error("Ошибка получения пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка получения пользователя" },
      { status: 500 }
    );
  }
}
