import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";
const bcrypt = require("bcryptjs");

initDatabase();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { password, role, name, email, phone, currentPassword } = body;
    const userId = parseInt(params.id);

    // Для изменения пароля требуется только имя
    // Для изменения роли требуется и роль и имя
    if (role && !name) {
      return NextResponse.json(
        { error: "Роль и имя обязательны" },
        { status: 400 }
      );
    }

    // Если изменяется только профиль (без роли), имя все равно требуется
    if (!name) {
      return NextResponse.json(
        { error: "Имя обязательно" },
        { status: 400 }
      );
    }

    // Если изменяется пароль, проверяем текущий пароль (для безопасности)
    if (password) {
      if (currentPassword) {
        // Проверяем текущий пароль
        const getCurrentPassword = db.prepare(
          "SELECT password FROM users WHERE id = ?"
        );
        const userResult = getCurrentPassword.get(userId) as { password: string } | undefined;
        
        if (!userResult || !bcrypt.compareSync(currentPassword, userResult.password)) {
          return NextResponse.json(
            { error: "Неверный текущий пароль" },
            { status: 400 }
          );
        }
      }
      
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      if (role) {
        // Обновляем пароль и роль
        const updateWithPassword = db.prepare(`
          UPDATE users 
          SET password = ?, role = ?, name = ?, email = ?, phone = ?
          WHERE id = ?
        `);
        updateWithPassword.run(
          hashedPassword,
          role,
          name,
          email || null,
          phone || null,
          userId
        );
      } else {
        // Обновляем только пароль и профиль
        const updatePasswordOnly = db.prepare(`
          UPDATE users 
          SET password = ?, name = ?, email = ?, phone = ?
          WHERE id = ?
        `);
        updatePasswordOnly.run(
          hashedPassword,
          name,
          email || null,
          phone || null,
          userId
        );
      }
    } else {
      if (role) {
        // Обновляем роль и профиль без пароля
        const updateWithoutPassword = db.prepare(`
          UPDATE users 
          SET role = ?, name = ?, email = ?, phone = ?
          WHERE id = ?
        `);
        updateWithoutPassword.run(
          role,
          name,
          email || null,
          phone || null,
          userId
        );
      } else {
        // Обновляем только профиль
        const updateProfileOnly = db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, phone = ?
          WHERE id = ?
        `);
        updateProfileOnly.run(
          name,
          email || null,
          phone || null,
          userId
        );
      }
    }

    // Возвращаем обновленные данные пользователя
    const getUpdatedUser = db.prepare(
      "SELECT id, username, role, name, email, phone, is_active, created_at FROM users WHERE id = ?"
    );
    const updatedUser = getUpdatedUser.get(userId);
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка обновления пользователя" },
      { status: 500 }
    );
  }
}
