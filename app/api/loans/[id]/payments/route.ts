import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

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
        WHERE al.action IN ('займ_погашен', 'займ_частично_погашен')
          AND al.details LIKE ?
        ORDER BY al.created_at DESC
      `)
      // Формат совпадает с записью в /api/loans/[id]/repay
      .all(`%(ID займа: ${loanId})%`);

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Ошибка получения платежей займа:", error);
    return NextResponse.json(
      { error: "Ошибка получения платежей займа" },
      { status: 500 }
    );
  }
}
