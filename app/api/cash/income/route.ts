import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

// Поступление в кассу. Доходы хранятся в expenses с отрицательной суммой —
// так их учитывают getCashBalance() и аналитика
export async function POST(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { amount, description } = body;

    if (!(Number.isFinite(amount) && amount > 0)) {
      return NextResponse.json(
        { error: "Сумма поступления должна быть больше 0" },
        { status: 400 }
      );
    }

    db.transaction(() => {
      db.prepare(
        `INSERT INTO expenses (amount, description, type, related_id)
         VALUES (?, ?, 'other', NULL)`
      ).run(-amount, description || "Поступление");

      logActivity(
        session.userId,
        "создание_поступления",
        "income",
        `Поступление на сумму $${amount}. ${description || ""}`.trim()
      );
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка создания поступления:", error);
    return NextResponse.json(
      { error: "Ошибка создания поступления" },
      { status: 500 }
    );
  }
}
