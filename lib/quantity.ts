// Объемы (m3) — дробные числа: 40 − 39.8 дает 0.20000000000000284.
// Сравниваем с допуском и сохраняем округленные остатки, чтобы не появлялись
// «пустые» заказы с объемом 0.0000001
export const QTY_EPS = 1e-6;

export function roundQty(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function sameQty(a: number, b: number): boolean {
  return Math.abs(a - b) < QTY_EPS;
}
