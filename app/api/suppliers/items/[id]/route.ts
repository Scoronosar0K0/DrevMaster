import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const itemId = parseInt(params.id);

    // Товар, по которому есть заказы или долги поставщика, удалить нельзя
    const usage = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM orders WHERE item_id = ?) +
           (SELECT COUNT(*) FROM supplier_debts WHERE item_id = ?) as count`
      )
      .get(itemId, itemId) as { count: number };
    if (usage.count > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить товар: по нему есть заказы" },
        { status: 400 }
      );
    }

    const deleteItem = db.prepare("DELETE FROM supplier_items WHERE id = ?");
    const result = deleteItem.run(itemId);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления товара:", error);
    return NextResponse.json(
      { error: "Ошибка удаления товара" },
      { status: 500 }
    );
  }
}
