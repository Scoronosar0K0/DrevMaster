import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, contact_person, phone, email, address, description } = body;
    const resolvedParams = await params;
    const supplierId = parseInt(resolvedParams.id);

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Название и телефон обязательны" },
        { status: 400 }
      );
    }

    const update = db.prepare(`
      UPDATE suppliers 
      SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, description = ?
      WHERE id = ?
    `);

    const result = update.run(
      name,
      contact_person || null,
      phone,
      email || null,
      address || null,
      description || null,
      supplierId
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Поставщик не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка обновления поставщика:", error);
    return NextResponse.json(
      { error: "Ошибка обновления поставщика" },
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
    const supplierId = parseInt(resolvedParams.id);

    const deleteSupplier = db.prepare("DELETE FROM suppliers WHERE id = ?");
    const result = deleteSupplier.run(supplierId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Поставщик не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления поставщика:", error);
    return NextResponse.json(
      { error: "Ошибка удаления поставщика" },
      { status: 500 }
    );
  }
}
