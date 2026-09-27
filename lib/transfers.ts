import { db } from "@/lib/database";

// Получатель перевода менеджера:
//   компания (to_user_type 'admin') — деньги поступают в кассу. Конкретного
//     администратора выбирает сервер: клиент раньше всегда присылал id 1, и
//     переводы переставали работать, если этого пользователя деактивировали
//     или удалили;
//   активный партнер — менеджер заплатил партнеру от имени компании.
export function resolveTransferRecipient(body: {
  to_user_type?: unknown;
  to_user_id?: unknown;
}): { id: number; name: string } | null {
  const requested = Number(body.to_user_id);
  const requestedRole = Number.isInteger(requested)
    ? (db.prepare("SELECT role FROM users WHERE id = ?").get(requested) as
        | { role: string }
        | undefined)?.role
    : undefined;

  if (body.to_user_type === "admin" || requestedRole === "admin") {
    return (
      (db
        .prepare(
          "SELECT id, name FROM users WHERE role = 'admin' AND is_active = true ORDER BY id LIMIT 1"
        )
        .get() as { id: number; name: string } | undefined) ?? null
    );
  }

  return (
    (db
      .prepare(
        "SELECT id, name FROM users WHERE id = ? AND role = 'partner' AND is_active = true"
      )
      .get(requested) as { id: number; name: string } | undefined) ?? null
  );
}
