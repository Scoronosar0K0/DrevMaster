import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);

    const items = db
      .prepare(
        `
      SELECT * FROM supplier_items 
      WHERE supplier_id = ?
      ORDER BY created_at ASC
    `
      )
      .all(supplierId);

    return NextResponse.json(items);
  } catch (error) {
    console.error("Ошибка получения товаров:", error);
    return NextResponse.json(
      { error: "Ошибка получения товаров" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name } = body;
    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);

    if (!name) {
      return NextResponse.json(
        { error: "Название товара обязательно" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли поставщик
    const supplier = db
      .prepare("SELECT id FROM suppliers WHERE id = ?")
      .get(supplierId);
    if (!supplier) {
      return NextResponse.json(
        { error: "Поставщик не найден" },
        { status: 404 }
      );
    }

    const insert = db.prepare(`
      INSERT INTO supplier_items (supplier_id, name)
      VALUES (?, ?)
    `);

    insert.run(supplierId, name);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка добавления товара:", error);
    return NextResponse.json(
      { error: "Ошибка добавления товара" },
      { status: 500 }
    );
  }
}
