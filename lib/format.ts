// Единое форматирование дат и денег для всего интерфейса

// SQLite datetime('now') хранит UTC без указания зоны ("2026-09-27 15:50:00"),
// а браузер разобрал бы такую строку как местное время. Даты без времени
// ("2026-09-27") наоборот считаем местными, чтобы не сдвигать день.
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) {
    return new Date(value.replace(" ", "T") + "Z");
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDbDate(value);
  return date ? date.toLocaleDateString("ru-RU") : "—";
}

export function formatTime(value: string | null | undefined): string {
  const date = parseDbDate(value);
  return date
    ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : "";
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDbDate(value);
  return date
    ? date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// $1,234,567.89 — всегда два знака после запятой
export function formatMoney(value: number | null | undefined): string {
  return moneyFormatter.format(Number(value) || 0);
}

// Сегодняшняя дата в формате YYYY-MM-DD по местному времени пользователя
// (toISOString() дал бы дату по UTC — в первые часы суток это вчерашний день)
export function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
