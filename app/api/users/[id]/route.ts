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
    const { password, role, name, email, phone } = body;
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);

    if (!role || !name) {
      return NextResponse.json(
        { error: "Роль и имя обязательны" },
        { status: 400 }
      );
    }

    // Обновляем пароль только если он указан
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);
    return NextResponse.json(
      { error: "Ошибка обновления пользователя" },
      { status: 500 }
    );
  }
}
