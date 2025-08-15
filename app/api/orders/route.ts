import { NextRequest, NextResponse } from "next/server";
import { db, initDatabase } from "@/lib/database";

initDatabase();

export async function GET() {
  try {
    const orders = db
      .prepare(
        `
      SELECT 
        o.*,
        s.name as supplier_name,
        si.name as item_name
      FROM orders o
      JOIN suppliers s ON o.supplier_id = s.id
      JOIN supplier_items si ON o.item_id = si.id
      ORDER BY o.created_at DESC
    `
      )
      .all();

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Ошибка получения заказов:", error);
    return NextResponse.json(
      { error: "Ошибка получения заказов" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      order_number,
      supplier_id,
      item_id,
      date,
      description,
      measurement,
      value,
      price_per_unit,
      total_price,
      multipleContainers,
      containers,
      unloaded_value,
      debt_handling,
      isCompanyLoading,
      selectedContainersForPayment,
      status,
    } = body;

    if (
      !order_number ||
      !supplier_id ||
      !item_id ||
      !date ||
      !value ||
      !total_price
    ) {
      return NextResponse.json(
        { error: "Все обязательные поля должны быть заполнены" },
        { status: 400 }
      );
    }

    // Проверяем, что поставщик и товар существуют
    const supplier = db
      .prepare("SELECT id FROM suppliers WHERE id = ?")
      .get(supplier_id);
    if (!supplier) {
      return NextResponse.json(
        { error: "Поставщик не найден" },
        { status: 404 }
      );
    }

    const item = db
      .prepare("SELECT id FROM supplier_items WHERE id = ? AND supplier_id = ?")
      .get(item_id, supplier_id);
    if (!item) {
      return NextResponse.json(
        { error: "Товар не найден у данного поставщика" },
        { status: 404 }
      );
    }

    // Проверяем уникальность номера заказа
    const existingOrder = db
      .prepare("SELECT id FROM orders WHERE order_number = ?")
      .get(order_number);
    if (existingOrder) {
      return NextResponse.json(
        { error: "Заказ с таким номером уже существует" },
        { status: 400 }
      );
    }

    // Получаем текущий баланс (займы - расходы)
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

    // Проверяем, достаточно ли средств
    if (total_price > currentBalance) {
      return NextResponse.json(
        {
          error: `Недостаточно средств! Необходимо: $${total_price.toFixed(
            2
          )}, Доступно: $${currentBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    let orderId: number = 0;
    const transaction = db.transaction(() => {
      // Определяем статус заказа
      const orderStatus = status || "paid";

      // Создаем основной заказ
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          order_number, supplier_id, item_id, date, description, measurement,
          value, price_per_unit, total_price, status, containers, container_loads
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderResult = insertOrder.run(
        order_number,
        supplier_id,
        item_id,
        date,
        description || null,
        measurement || "m3",
        value,
        price_per_unit || null,
        total_price,
        orderStatus,
        multipleContainers ? containers?.length || 1 : 1,
        multipleContainers ? JSON.stringify(containers) : null
      );
      
      orderId = orderResult.lastInsertRowid as number;

      // Если есть незагруженный объем, создаем долг у поставщика
      if (unloaded_value && unloaded_value > 0) {
        // Создаем запись долга поставщика
        const insertSupplierDebt = db.prepare(`
          INSERT INTO supplier_debts (supplier_id, item_id, order_id, debt_value)
          VALUES (?, ?, ?, ?)
        `);
        insertSupplierDebt.run(
          supplier_id,
          item_id,
          orderResult.lastInsertRowid,
          unloaded_value
        );

        // Логируем активность
        const insertLog = db.prepare(`
          INSERT INTO activity_logs (user_id, action, entity_type, details)
          VALUES (1, 'долг_поставщика_создан', 'supplier', ?)
        `);
        insertLog.run(
          `Создан долг поставщика ${supplier_id}: ${unloaded_value} ${measurement} товара ID ${item_id} (заказ ${order_number})`
        );
      }

      // Добавляем расход только если это не займ
      if (orderStatus !== "loan") {
        const insertExpense = db.prepare(`
          INSERT INTO expenses (amount, description, type, related_id)
          VALUES (?, ?, 'order', ?)
        `);
        insertExpense.run(
          total_price,
          `Заказ ${order_number}`,
          orderResult.lastInsertRowid
        );
      }

      // Обрабатываем работу с долгами поставщика
      if (debt_handling && debt_handling.amount > 0) {
        // Получаем долги поставщика для данного товара
        const supplierDebts = db
          .prepare(
            `
            SELECT sd.id, sd.debt_value 
            FROM supplier_debts sd 
            JOIN supplier_items si ON sd.item_id = si.id 
            WHERE sd.supplier_id = ? AND si.name = ? AND sd.is_settled = false 
            ORDER BY sd.created_at ASC
          `
          )
          .all(supplier_id, debt_handling.item_name) as any[];

        let remainingDebtToSettle = debt_handling.amount;

        // Погашаем долги постепенно
        for (const debt of supplierDebts) {
          if (remainingDebtToSettle <= 0) break;

          if (debt.debt_value <= remainingDebtToSettle) {
            // Полностью погашаем этот долг
            db.prepare(
              `
              UPDATE supplier_debts 
              SET is_settled = true, settled_at = datetime('now') 
              WHERE id = ?
            `
            ).run(debt.id);
            remainingDebtToSettle -= debt.debt_value;
          } else {
            // Частично погашаем долг
            const newDebtValue = debt.debt_value - remainingDebtToSettle;
            db.prepare(
              `
              UPDATE supplier_debts 
              SET debt_value = ? 
              WHERE id = ?
            `
            ).run(newDebtValue, debt.id);
            remainingDebtToSettle = 0;
          }
        }

        // Логируем погашение долга
        if (debt_handling.type === "subtract") {
          const insertDebtLog = db.prepare(`
            INSERT INTO activity_logs (user_id, action, entity_type, details)
            VALUES (1, 'зачет_долга', 'supplier', ?)
          `);
          insertDebtLog.run(
            `Зачтен долг поставщика ${supplier_id}: ${
              debt_handling.amount
            } ${measurement} товара "${debt_handling.item_name}". Экономия: $${(
              debt_handling.original_total_price -
              debt_handling.final_total_price
            ).toFixed(2)}`
          );
        } else if (debt_handling.type === "add_to_order") {
          const insertDebtLog = db.prepare(`
            INSERT INTO activity_logs (user_id, action, entity_type, details)
            VALUES (1, 'добавление_долга_к_заказу', 'supplier', ?)
          `);
          insertDebtLog.run(
            `Добавлен долг поставщика ${supplier_id} к заказу: +${debt_handling.amount} ${measurement} товара "${debt_handling.item_name}"`
          );
        }
      }

      // Логируем создание заказа
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (1, 'заказ_создан', 'order', ?)
      `);
      const logDetails = debt_handling
        ? `Создан заказ ${order_number} на сумму $${total_price} (с учетом долга поставщика: ${
            debt_handling.type === "subtract" ? "вычет" : "добавление"
          } ${debt_handling.amount} ${measurement})`
        : `Создан заказ ${order_number} на сумму $${total_price}`;
      insertLog.run(logDetails);
    });

    transaction();

    // Получаем созданный заказ для возврата
    const createdOrder = db
      .prepare(`
        SELECT o.*, s.name as supplier_name, si.name as item_name
        FROM orders o
        LEFT JOIN suppliers s ON o.supplier_id = s.id
        LEFT JOIN supplier_items si ON o.item_id = si.id
        WHERE o.id = ?
      `)
      .get(orderId) as any;

    return NextResponse.json({ 
      success: true, 
      order: createdOrder 
    });
  } catch (error) {
    console.error("Ошибка создания заказа:", error);
    return NextResponse.json(
      { error: "Ошибка создания заказа" },
      { status: 500 }
    );
  }
}
