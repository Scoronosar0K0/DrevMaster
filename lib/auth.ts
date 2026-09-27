import { jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

// Этот секрет опубликован в репозитории, поэтому он допустим только для
// локальной разработки. В продакшене JWT_SECRET обязан быть задан в .env.local
const DEV_FALLBACK_SECRET = "drevmaster-secret-key-2024";

export const AUTH_COOKIE = "auth-token";

export interface AuthPayload extends JWTPayload {
  userId: number;
  username: string;
  role: string;
  partnerId: number | null;
}

// Секрет читается при вызове, а не при импорте: маршруты импортируются
// во время `next build`, где .env.local может отсутствовать
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET не задан. Добавьте его в .env.local (например: openssl rand -hex 32)"
      );
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as AuthPayload;
}

// Возвращает пользователя из cookie или заголовка Authorization, либо null
export async function getSessionUser(
  request: NextRequest
): Promise<AuthPayload | null> {
  let token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.substring(7);
  }
  if (!token) return null;

  try {
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}
