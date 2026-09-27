import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request);

    if (!session) {
      return NextResponse.json(
        { error: "Недействительный токен" },
        { status: 401 }
      );
    }

    // Имя и контакты берем из базы: в токене их нет, и они могут меняться
    const user = db
      .prepare(
        "SELECT id, username, name, email, phone, role FROM users WHERE id = ?"
      )
      .get(session.userId) as any;

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 401 }
      );
    }

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
    console.error("Ошибка проверки токена:", error);
    return NextResponse.json(
      { error: "Недействительный токен" },
      { status: 401 }
    );
  }
}
