import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { initDatabase } from "@/lib/database";
import { getCashBalance } from "@/lib/balance";

initDatabase();

// Принудительно делаем эндпоинт динамическим
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    // Баланс кассы: займы партнеров и администратора + поступления − расходы.
    // Долг менеджеров за товар в кассу не входит (см. lib/balance.ts)
    return NextResponse.json({ balance: getCashBalance() });
  } catch (error) {
    console.error("Ошибка получения баланса:", error);
    return NextResponse.json(
      { error: "Ошибка получения баланса" },
      { status: 500 }
    );
  }
}
