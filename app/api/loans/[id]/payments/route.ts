import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const loanId = parseInt(params.id);

    // Получаем историю платежей по займу из таблицы activity_logs
    const payments = db
      .prepare(`
        SELECT 
          al.details,
          al.created_at as payment_date,
          CASE 
            WHEN al.details LIKE '%$%' THEN 
              CAST(SUBSTR(al.details, INSTR(al.details, '$') + 1, 
                   CASE 
                     WHEN INSTR(SUBSTR(al.details, INSTR(al.details, '$') + 1), ' ') > 0 
                     THEN INSTR(SUBSTR(al.details, INSTR(al.details, '$') + 1), ' ') - 1
                     ELSE LENGTH(SUBSTR(al.details, INSTR(al.details, '$') + 1))
                   END) AS REAL)
            ELSE 0
          END as amount
        FROM activity_logs al
        WHERE al.action = 'займ_оплачен' 
          AND al.details LIKE '%займ ID: ${loanId}%'
        ORDER BY al.created_at DESC
      `)
      .all();

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Ошибка получения платежей займа:", error);
    return NextResponse.json(
      { error: "Ошибка получения платежей займа" },
      { status: 500 }
    );
  }
}
