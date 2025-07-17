import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET() {
  try {
    const suppliers = db
      .prepare(
        `
      SELECT * FROM suppliers 
      ORDER BY created_at DESC
    `
      )
      .all();

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Ошибка получения поставщиков:", error);
    return NextResponse.json(
      { error: "Ошибка получения поставщиков" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contact_person, phone, email, address, description } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Название и телефон обязательны" },
        { status: 400 }
      );
    }

    const insert = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      name,
      contact_person || null,
      phone,
      email || null,
      address || null,
      description || null
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка создания поставщика:", error);
    return NextResponse.json(
      { error: "Ошибка создания поставщика" },
      { status: 500 }
    );
  }
}
