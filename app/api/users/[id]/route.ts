import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { password, currentPassword, role, name, email, phone, is_active } =
      body;
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);

    // Получаем текущего пользователя
    const currentUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;

    if (!currentUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Если роль не передана, используем текущую роль пользователя
    let updateRole = role || currentUser.role;

    if (!updateRole || !name) {
      return NextResponse.json(
        { error: "Роль и имя обязательны" },
        { status: 400 }
      );
    }

    // Проверяем текущий пароль, если пытаемся изменить пароль
    if (password) {
      if (currentPassword) {
        // Проверяем текущий пароль для самообновления профиля
        const isCurrentPasswordValid = bcrypt.compareSync(
          currentPassword,
          currentUser.password
        );
        if (!isCurrentPasswordValid) {
          return NextResponse.json(
            { error: "Неверный текущий пароль" },
            { status: 400 }
          );
        }
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const updateWithPassword = db.prepare(`
        UPDATE users 
        SET password = ?, role = ?, name = ?, email = ?, phone = ?, is_active = ?
        WHERE id = ?
      `);
      updateWithPassword.run(
        hashedPassword,
        updateRole,
        name,
        email || null,
        phone || null,
        is_active !== undefined ? (is_active ? 1 : 0) : currentUser.is_active,
        userId
      );
    } else {
      const updateWithoutPassword = db.prepare(`
        UPDATE users 
        SET role = ?, name = ?, email = ?, phone = ?, is_active = ?
        WHERE id = ?
      `);
      updateWithoutPassword.run(
        updateRole,
        name,
        email || null,
        phone || null,
        is_active !== undefined ? (is_active ? 1 : 0) : currentUser.is_active,
        userId
      );
    }

    // Получаем обновленного пользователя
    const updatedUser = db
      .prepare(
        "SELECT id, username, name, role, email, phone, is_active FROM users WHERE id = ?"
      )
      .get(userId) as any;

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);

    // Получаем данные пользователя для логирования
    const user = db
      .prepare("SELECT username, name, role FROM users WHERE id = ?")
      .get(userId) as any;

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Запрещаем удаление администратора
    if (user.username === "admin") {
      return NextResponse.json(
        { error: "Нельзя удалить администратора" },
        { status: 400 }
      );
    }

    // Начинаем транзакцию для удаления пользователя и связанных данных
    const transaction = db.transaction(() => {
      // Если это партнер, удаляем связанные данные
      if (user.role === "partner") {
        const partner = db
          .prepare("SELECT id FROM partners WHERE user_id = ?")
          .get(userId) as any;

        if (partner) {
          // Удаляем займы партнера
          db.prepare("DELETE FROM loans WHERE partner_id = ?").run(partner.id);
        }

        // Удаляем запись партнера
        db.prepare("DELETE FROM partners WHERE user_id = ?").run(userId);
      }

      // Удаляем переводы менеджера
      db.prepare(
        "DELETE FROM manager_transfers WHERE from_manager_id = ? OR to_user_id = ?"
      ).run(userId, userId);

      // Удаляем продажи менеджера
      db.prepare("DELETE FROM manager_sales WHERE manager_id = ?").run(userId);

      // Удаляем пользователя
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);

      // Логируем удаление
      db.prepare(
        `
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'удален', 'user', ?)
      `
      ).run(
        `Удален пользователь: ${user.name} (${user.username}), роль: ${user.role}`
      );
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка удаления пользователя" },
      { status: 500 }
    );
  }
}
