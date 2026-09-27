import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase, deleteUserIfNoHistory } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const managerId = parseInt(params.id);

    const manager = db
      .prepare(
        `
      SELECT 
        u.id,
        u.username,
        u.name,
        u.email,
        u.phone,
        u.is_active,
        u.created_at
      FROM users u
      WHERE u.id = ? AND u.role = 'manager'
    `
      )
      .get(managerId);

    if (!manager) {
      return NextResponse.json(
        { error: "Менеджер не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json(manager);
  } catch (error) {
    console.error("Ошибка получения менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка получения менеджера" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const managerId = parseInt(params.id);
    const body = await request.json();
    const { username, password, name, email, phone, is_active } = body;

    if (!username || !name) {
      return NextResponse.json(
        { error: "Username и name обязательны" },
        { status: 400 }
      );
    }

    // Проверяем что менеджер существует
    const existingManager = db
      .prepare("SELECT id FROM users WHERE id = ? AND role = 'manager'")
      .get(managerId);
    if (!existingManager) {
      return NextResponse.json(
        { error: "Менеджер не найден" },
        { status: 404 }
      );
    }

    // Проверяем уникальность username (исключая текущего пользователя)
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .get(username, managerId);
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким username уже существует" },
        { status: 400 }
      );
    }

    // Обновляем менеджера. Статус меняем, только если он явно передан:
    // форма редактирования его не отправляет, и раньше сохранение формы
    // молча активировало деактивированного менеджера
    let updateQuery = `
      UPDATE users 
      SET username = ?, name = ?, email = ?, phone = ?
    `;
    let queryParams: (string | number | null)[] = [
      username,
      name,
      email || null,
      phone || null,
    ];
    if (typeof is_active === "boolean") {
      updateQuery += `, is_active = ?`;
      queryParams.push(is_active ? 1 : 0);
    }

    // Если предоставлен новый пароль, обновляем его
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updateQuery += `, password = ?`;
      queryParams.push(hashedPassword);
    }

    updateQuery += ` WHERE id = ?`;
    queryParams.push(managerId);

    db.prepare(updateQuery).run(...queryParams);

    // Логируем активность
    logActivity(session.userId, "обновлен", "manager", `Обновлен менеджер: ${name} (${username})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обновления менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка обновления менеджера" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const managerId = parseInt(params.id);

    // Проверяем что менеджер существует
    const manager = db
      .prepare(
        "SELECT name, username FROM users WHERE id = ? AND role = 'manager'"
      )
      .get(managerId) as any;
    if (!manager) {
      return NextResponse.json(
        { error: "Менеджер не найден" },
        { status: 404 }
      );
    }

    // Удаляем менеджера
    if (!deleteUserIfNoHistory(managerId)) {
      return NextResponse.json(
        {
          error:
            "У менеджера есть финансовая история (долги, переводы или продажи). Деактивируйте его в настройках вместо удаления",
        },
        { status: 400 }
      );
    }

    // Логируем активность
    logActivity(session.userId, "удален", "manager", `Удален менеджер: ${manager.name} (${manager.username})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка удаления менеджера" },
      { status: 500 }
    );
  }
}
