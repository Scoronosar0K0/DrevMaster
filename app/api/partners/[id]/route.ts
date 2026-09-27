import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase, deleteUserIfNoHistory } from "@/lib/database";

initDatabase();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = parseInt(params.id);

    // Проверяем, что партнер существует
    const partner = db
      .prepare("SELECT id, name, user_id FROM partners WHERE id = ?")
      .get(partnerId) as any;

    if (!partner) {
      return NextResponse.json(
        { error: "Партнер не найден" },
        { status: 404 }
      );
    }

    // Проверяем, есть ли неоплаченные займы у этого партнера
    const unpaidLoans = db
      .prepare("SELECT COUNT(*) as count FROM loans WHERE partner_id = ? AND is_paid = false")
      .get(partnerId) as any;

    if (unpaidLoans.count > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить партнера с неоплаченными займами (${unpaidLoans.count} займов)` },
        { status: 400 }
      );
    }

    // Удаляем партнера вместе с его учетной записью. Если у партнера есть
    // история займов, записи нужны для отчетов — тогда только деактивируем
    // учетную запись: партнер исчезнет из списка и не сможет войти
    if (!deleteUserIfNoHistory(partner.user_id)) {
      db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(
        partner.user_id
      );
    }

    // Логируем активность
    try {
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'удален', 'partner', ?)
      `);
      insertLog.run(`Удален партнер: ${partner.name}`);
    } catch (logError) {
      console.error("Ошибка логирования:", logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления партнера:", error);
    return NextResponse.json(
      { error: "Ошибка удаления партнера" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = parseInt(params.id);
    const body = await request.json();
    const { name, username, email, phone, description, password } = body;

    if (!name || !username) {
      return NextResponse.json(
        { error: "Имя и имя пользователя обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, что партнер существует
    const existingPartner = db
      .prepare("SELECT id, user_id FROM partners WHERE id = ?")
      .get(partnerId) as any;

    if (!existingPartner) {
      return NextResponse.json(
        { error: "Партнер не найден" },
        { status: 404 }
      );
    }

    // Проверяем уникальность username (логин хранится в таблице users)
    const usernameCheck = db
      .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .get(username, existingPartner.user_id) as any;

    if (usernameCheck) {
      return NextResponse.json(
        { error: "Имя пользователя уже занято" },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Логин, контакты и пароль хранятся в users, описание — в partners
      db.prepare(
        `
        UPDATE users 
        SET name = ?, username = ?, email = ?, phone = ?
        WHERE id = ?
      `
      ).run(name, username, email || null, phone || null, existingPartner.user_id);

      db.prepare(
        `
        UPDATE partners 
        SET name = ?, contact_info = ?, description = ?
        WHERE id = ?
      `
      ).run(name, email || phone || null, description || null, partnerId);

      // Если указан новый пароль, обновляем его
      if (password) {
        const bcrypt = require("bcryptjs");
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
          hashedPassword,
          existingPartner.user_id
        );
      }

      // Логируем активность
      try {
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'обновлен', 'partner', ?)
        `);
        insertLog.run(`Обновлен партнер: ${name}`);
      } catch (logError) {
        console.error("Ошибка логирования:", logError);
      }
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обновления партнера:", error);
    return NextResponse.json(
      { error: "Ошибка обновления партнера" },
      { status: 500 }
    );
  }
}
