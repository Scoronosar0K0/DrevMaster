import { db } from "@/lib/database";

// Записывает действие в журнал от имени пользователя, который его выполнил.
// Если пользователь уже удален (токен еще действует), запись сохраняется без
// привязки к пользователю, чтобы внешний ключ не сорвал основную операцию
export function logActivity(
  userId: number | null | undefined,
  action: string,
  entityType: string,
  details: string
) {
  const exists =
    userId != null &&
    db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId) !== undefined;

  db.prepare(
    `INSERT INTO activity_logs (user_id, action, entity_type, details)
     VALUES (?, ?, ?, ?)`
  ).run(exists ? userId : null, action, entityType, details);
}
