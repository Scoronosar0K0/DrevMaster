import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { is_active } = body;
    const userId = parseInt(params.id);

    const update = db.prepare(`
      UPDATE users SET is_active = ? WHERE id = ?
    `);

    const result = update.run(is_active, userId);

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
