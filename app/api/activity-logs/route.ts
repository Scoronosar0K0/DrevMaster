import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession } from "@/lib/session";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET(request: NextRequest) {
  const session = await requireActiveSession(request);
  if (session instanceof NextResponse) return session;

  try {
    // Получаем параметры из URL 
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const entityType = url.searchParams.get("entity_type");
    const user = url.searchParams.get("user");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    let query = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.entity_type,
        al.details,
        al.created_at,
        u.name as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      query += " AND al.action = ?";
      params.push(action);
    }

    // Например, exclude_action=вход убирает записи о входе из ленты на главной
    const excludeAction = url.searchParams.get("exclude_action");
    if (excludeAction) {
      query += " AND al.action != ?";
      params.push(excludeAction);
    }

    if (entityType) {
      query += " AND al.entity_type = ?";
      params.push(entityType);
    }

    if (user) {
      query += " AND u.name = ?";
      params.push(user);
    }

    if (dateFrom) {
      query += " AND date(al.created_at) >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      query += " AND date(al.created_at) <= ?";
      params.push(dateTo);
    }

    // Границы периода в UTC ('YYYY-MM-DD HH:MM:SS'), как хранит SQLite.
    // Страница истории переводит в них выбранные местные даты, чтобы фильтр
    // совпадал с датами, которые пользователь видит на экране
    const UTC_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    const createdFrom = url.searchParams.get("created_from");
    const createdBefore = url.searchParams.get("created_before");

    if (createdFrom && UTC_DATETIME.test(createdFrom)) {
      query += " AND al.created_at >= ?";
      params.push(createdFrom);
    }

    if (createdBefore && UTC_DATETIME.test(createdBefore)) {
      query += " AND al.created_at < ?";
      params.push(createdBefore);
    }

    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "") || 1000, 1),
      1000
    );
    query += " ORDER BY al.created_at DESC, al.id DESC LIMIT ?";
    params.push(limit);

    let logs = [];
    try {
      logs = db.prepare(query).all(...params);
    } catch (e) {
      console.log("Таблица activity_logs еще не создана");
      logs = [];
    }

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Ошибка получения логов:", error);
    return NextResponse.json(
      { error: "Ошибка получения логов" },
      { status: 500 }
    );
  }
}
