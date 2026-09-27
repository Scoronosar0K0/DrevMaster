import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, type AuthPayload } from "@/lib/auth";
import { db } from "@/lib/database";

// Проверка сессии в API-маршрутах (Node.js).
//
// middleware.ts проверяет только подпись токена: в edge-среде нет доступа к
// базе. Здесь дополнительно сверяемся с базой, чтобы удаление, деактивация
// или смена роли пользователя действовали сразу, а не через 7 дней, когда
// истечет токен. Роль берется из базы; если она изменилась, пользователь
// должен войти заново (и middleware снова будет видеть актуальную роль).
//
// Использование:
//   const session = await requireActiveSession(request);
//   if (session instanceof NextResponse) return session;
//   // session.userId, session.role
export async function requireActiveSession(
  request: NextRequest
): Promise<AuthPayload | NextResponse> {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const user = db
    .prepare("SELECT role, is_active FROM users WHERE id = ?")
    .get(session.userId) as { role: string; is_active: number } | undefined;

  if (!user || !user.is_active || user.role !== session.role) {
    return NextResponse.json(
      { error: "Сессия больше не действительна. Войдите снова" },
      { status: 401 }
    );
  }

  return session;
}
