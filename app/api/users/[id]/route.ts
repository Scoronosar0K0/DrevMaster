import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase, deleteUserIfNoHistory } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { password, name, email, phone, currentPassword, username } = body;
    let { role } = body;
    const userId = parseInt(params.id);

    // Администратор может менять любого пользователя,
    // остальные — только свой профиль, без смены роли и логина
    const isAdmin = session.role === "admin";
    if (!isAdmin && session.userId !== userId) {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }
    if (!isAdmin) {
      role = undefined;
      if (password && !currentPassword) {
        return NextResponse.json(
          { error: "Введите текущий пароль" },
          { status: 400 }
        );
      }
    }

    if (!name) {
      return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
    }

    const target = db
      .prepare("SELECT id, username, role, password, is_active FROM users WHERE id = ?")
      .get(userId) as
      | { id: number; username: string; role: string; password: string; is_active: number }
      | undefined;
    if (!target) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (role && !["admin", "manager", "partner", "user"].includes(role)) {
      return NextResponse.json({ error: "Неизвестная роль" }, { status: 400 });
    }

    // Нельзя снять роль администратора с последнего активного администратора
    if (role && role !== "admin" && target.role === "admin") {
      const admins = db
        .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true")
        .get() as { count: number };
      if (admins.count <= 1) {
        return NextResponse.json(
          { error: "Нельзя снять роль с последнего администратора" },
          { status: 400 }
        );
      }
    }

    // Логин меняет только администратор; он должен быть уникальным
    const newUsername =
      isAdmin && typeof username === "string" && username.trim()
        ? username.trim()
        : target.username;
    if (newUsername !== target.username) {
      const taken = db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .get(newUsername, userId);
      if (taken) {
        return NextResponse.json(
          { error: "Пользователь с таким логином уже существует" },
          { status: 400 }
        );
      }
    }

    // Смена пароля: текущий пароль проверяем, если он передан
    // (администратор может задать новый пароль другому пользователю без него)
    if (password && currentPassword && !bcrypt.compareSync(currentPassword, target.password)) {
      return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });
    }

    const newRole = role || target.role;
    db.transaction(() => {
      db.prepare(
        `UPDATE users SET username = ?, role = ?, name = ?, email = ?, phone = ?, password = ?
         WHERE id = ?`
      ).run(
        newUsername,
        newRole,
        name,
        email || null,
        phone || null,
        password ? bcrypt.hashSync(password, 10) : target.password,
        userId
      );

      // У партнера должна быть запись в partners (займы, список партнеров).
      // При смене роли на «Партнер» создаем ее; при смене роли с «Партнера»
      // запись остается — на нее могут ссылаться займы
      if (newRole === "partner") {
        const existing = db
          .prepare("SELECT id FROM partners WHERE user_id = ? AND id != 0")
          .get(userId);
        if (existing) {
          db.prepare("UPDATE partners SET name = ? WHERE user_id = ? AND id != 0").run(name, userId);
        } else {
          db.prepare(
            "INSERT INTO partners (user_id, name, contact_info, description) VALUES (?, ?, ?, ?)"
          ).run(userId, name, email || phone || null, `Партнер: ${name}`);
        }
      }
    })();

    // Возвращаем обновленные данные пользователя
    const updatedUser = db
      .prepare(
        "SELECT id, username, role, name, email, phone, is_active, created_at FROM users WHERE id = ?"
      )
      .get(userId);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка обновления пользователя" },
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
    const userId = parseInt(params.id);

    // Проверяем что пользователь существует
    const user = db
      .prepare("SELECT username, name, role FROM users WHERE id = ?")
      .get(userId) as any;

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Нельзя удалить свою учетную запись и последнего администратора
    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Нельзя удалить свою учетную запись" },
        { status: 400 }
      );
    }
    if (user.role === "admin") {
      const admins = db
        .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true")
        .get() as { count: number };
      if (admins.count <= 1) {
        return NextResponse.json(
          { error: "Нельзя удалить последнего администратора" },
          { status: 400 }
        );
      }
    }

    // Удаляем пользователя
    if (!deleteUserIfNoHistory(userId)) {
      return NextResponse.json(
        {
          error:
            "У пользователя есть финансовая история (займы, переводы или продажи). Деактивируйте его вместо удаления",
        },
        { status: 400 }
      );
    }

    // Логируем активность
    try {
      logActivity(session.userId, "удален", "user", `Удален пользователь: ${user.name} (${user.username})`);
    } catch (logError) {
      console.error("Ошибка логирования:", logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка удаления пользователя" },
      { status: 500 }
    );
  }
}
