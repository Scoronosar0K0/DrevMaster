import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { containers, totalCost } = body;
    const orderId = parseInt(params.id);

    if (
      !containers ||
      containers.length === 0 ||
      !totalCost ||
      totalCost <= 0
    ) {
      return NextResponse.json(
        { error: "Контейнеры и общая стоимость должны быть указаны" },
        { status: 400 }
      );
    }

    // Проверяем, что заказ существует и имеет статус "loan"
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND status = ?")
      .get(orderId, "loan") as any;
    if (!order) {
      return NextResponse.json(
        { error: "Заказ не найден или имеет неверный статус" },
        { status: 404 }
      );
    }

    // Объем выбранных контейнеров не может превышать объем заказа
    const paidValue = containers.reduce(
      (sum: number, c: any) => sum + (Number(c.value) || 0),
      0
    );
    const EPSILON = 1e-6;
    if (paidValue <= 0 || paidValue > order.value + EPSILON) {
      return NextResponse.json(
        { error: "Объем выбранных контейнеров должен быть больше 0 и не превышать объем заказа" },
        { status: 400 }
      );
    }
    const isPartialPayment = paidValue < order.value - EPSILON;

    // Проверяем баланс
    const loansResult = db
      .prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = false")
      .get() as { total: number | null };
    const totalLoans = loansResult.total || 0;

    const expensesResult = db
      .prepare("SELECT SUM(amount) as total FROM expenses WHERE amount > 0")
      .get() as { total: number | null };
    const totalExpenses = expensesResult.total || 0;

    const incomeResult = db
      .prepare("SELECT SUM(ABS(amount)) as total FROM expenses WHERE amount < 0")
      .get() as { total: number | null };
    const totalIncome = incomeResult.total || 0;

    const currentBalance = totalLoans + totalIncome - totalExpenses;

    if (totalCost > currentBalance) {
      return NextResponse.json(
        {
          error: `Недостаточно средств! Необходимо: $${totalCost.toFixed(
            2
          )}, Доступно: $${currentBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Добавляем расход для оплаты займа
      const insertExpense = db.prepare(`
        INSERT INTO expenses (amount, description, type, related_id)
        VALUES (?, ?, 'order', ?)
      `);
      insertExpense.run(
        totalCost,
        `Оплата займа за заказ ${order.order_number}`,
        orderId
      );

      // Создаем данные контейнеров для сохранения
      const containerData = containers.map((container: any) => ({
        container: container.container,
        value: container.value,
        cost: container.cost,
        description: container.description,
        measurement: order.measurement,
      }));

      if (!isPartialPayment) {
        // Оплачен весь объем — заказ целиком переходит в статус "paid"
        const update = db.prepare(`
          UPDATE orders 
          SET status = 'paid', 
              total_price = ?,
              container_loads = ?
          WHERE id = ?
        `);
        update.run(totalCost, JSON.stringify(containerData), orderId);
      } else {
        // Частичная оплата — разделяем заказ, как при создании контейнера:
        // оплаченные контейнеры становятся новым заказом, остаток остается в займе
        const paidOrderNumber = `${order.order_number}-P${Math.floor(Date.now() / 1000)}`;
        db.prepare(
          `
          INSERT INTO orders (
            order_number, supplier_id, item_id, date, description, measurement,
            value, price_per_unit, total_price, status, containers, container_loads
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)
        `
        ).run(
          paidOrderNumber,
          order.supplier_id,
          order.item_id,
          order.date,
          `Оплачено из займа ${order.order_number}`,
          order.measurement,
          paidValue,
          totalCost / paidValue,
          totalCost,
          containers.length,
          JSON.stringify(containerData)
        );

        // Убираем оплаченные контейнеры из исходного заказа.
        // Номера контейнеров в интерфейсе — это позиция в container_loads (с 1)
        const paidNumbers = new Set(containers.map((c: any) => c.container));
        let remainingLoads: string | null = null;
        if (order.container_loads) {
          try {
            const loads = JSON.parse(order.container_loads);
            remainingLoads = JSON.stringify(
              loads.filter((_: any, index: number) => !paidNumbers.has(index + 1))
            );
          } catch (e) {
            remainingLoads = null;
          }
        }
        const remainingValue = order.value - paidValue;
        const remainingPrice = order.total_price
          ? (order.total_price * remainingValue) / order.value
          : null;
        db.prepare(
          `
          UPDATE orders 
          SET value = ?, total_price = ?, containers = ?, container_loads = ?
          WHERE id = ?
        `
        ).run(
          remainingValue,
          remainingPrice,
          Math.max(1, (order.containers || 1) - containers.length),
          remainingLoads,
          orderId
        );
      }

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'оплата_займа', 'order', ?)
      `);
      insertLog.run(
        `Заказ ${order.order_number}: оплата займа на сумму $${totalCost}. Контейнеров: ${containers.length}${
          isPartialPayment
            ? `. Частичная оплата: ${paidValue} ${order.measurement}, остаток ${order.value - paidValue} ${order.measurement} в займе`
            : ""
        }`
      );
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка оплаты займа:", error);
    return NextResponse.json({ error: "Ошибка оплаты займа" }, { status: 500 });
  }
}
