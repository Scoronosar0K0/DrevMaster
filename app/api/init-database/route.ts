import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/database";

export async function GET() {
  try {
    // Проверяем, что это продакшн среда и первый запуск
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "Этот эндпоинт только для продакшн среды" },
        { status: 403 }
      );
    }

    console.log("Начинаем инициализацию базы данных...");

    await initDatabase();

    return NextResponse.json({
      success: true,
      message:
        "База данных успешно инициализирована! Администратор создан с логином 'admin' и паролем 'admin'",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ошибка инициализации базы данных:", error);

    return NextResponse.json(
      {
        error: "Ошибка инициализации базы данных",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Также поддерживаем POST метод для удобства
  return GET();
}
