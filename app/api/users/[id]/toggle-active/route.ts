import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { is_active } = body;
    const userId = parseInt(params.id);

    // Нельзя деактивировать себя и последнего активного администратора —
    // иначе в систему некому будет войти
    if (!is_active) {
      if (userId === session.userId) {
        return NextResponse.json(
          { error: "Нельзя деактивировать свою учетную запись" },
          { status: 400 }
        );
      }
      const target = db
        .prepare("SELECT role FROM users WHERE id = ?")
        .get(userId) as { role: string } | undefined;
      if (target?.role === "admin") {
        const admins = db
          .prepare(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND id != ?"
          )
          .get(userId) as { count: number };
        if (admins.count === 0) {
          return NextResponse.json(
            { error: "Нельзя деактивировать последнего администратора" },
            { status: 400 }
          );
        }
      }
    }

    const update = db.prepare(`
      UPDATE users SET is_active = ? WHERE id = ?
    `);

    const result = update.run(is_active ? 1 : 0, userId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка изменения статуса пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка изменения статуса пользователя" },
      { status: 500 }
    );
  }
}
