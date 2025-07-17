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

    // Получаем активные долги поставщика из таблицы supplier_debts
    const debts = db
      .prepare(
        `
        SELECT 
          sd.id,
          sd.debt_value,
          sd.order_id,
          si.name as item_name,
          si.id as item_id,
          o.order_number,
          o.measurement
        FROM supplier_debts sd
        JOIN supplier_items si ON sd.item_id = si.id
        JOIN orders o ON sd.order_id = o.id
        WHERE sd.supplier_id = ? AND sd.is_settled = false
        ORDER BY sd.created_at ASC
      `
      )
      .all(supplierId) as any[];

    // Группируем долги по товарам
    const debtByItem = new Map<
      string,
      {
        item_name: string;
        item_id: number;
        total_debt_value: number;
        measurement: string;
        orders: any[];
      }
    >();

    for (const debt of debts) {
      const itemKey = `${debt.item_name}-${debt.measurement}`;

      if (!debtByItem.has(itemKey)) {
        debtByItem.set(itemKey, {
          item_name: debt.item_name,
          item_id: debt.item_id,
          total_debt_value: 0,
          measurement: debt.measurement,
          orders: [],
        });
      }

      const itemDebt = debtByItem.get(itemKey)!;
      itemDebt.total_debt_value += debt.debt_value;
      itemDebt.orders.push({
        debt_id: debt.id,
        order_id: debt.order_id,
        order_number: debt.order_number,
        debt_value: debt.debt_value,
      });
    }

    // Преобразуем Map в массив
    const debtDetails = Array.from(debtByItem.values()).filter(
      (item) => item.total_debt_value > 0
    );

    return NextResponse.json({
      supplier_id: supplierId,
      debt_by_items: debtDetails,
      total_items_count: debtDetails.length,
    });
  } catch (error) {
    console.error("Ошибка получения долга поставщика:", error);
    return NextResponse.json(
      { error: "Ошибка получения долга поставщика" },
      { status: 500 }
    );
  }
}
