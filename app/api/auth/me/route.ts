import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "R2EYR5d7gdXup846"
);

export async function GET(request: NextRequest) {
  try {
    // Получаем токен из cookie
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Токен авторизации не найден" },
        { status: 401 }
      );
    }

    // Декодируем токен
    const { payload } = await jwtVerify(token, JWT_SECRET);

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        username: payload.username,
        name: payload.name,
        role: payload.role,
        partnerId: payload.partnerId,
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
