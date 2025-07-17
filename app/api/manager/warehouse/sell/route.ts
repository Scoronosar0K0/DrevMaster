import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
);

export async function POST(request: NextRequest) {
  try {
    // Получаем токен из cookie
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Токен авторизации не найден" },
        { status: 401 }
      );
    }

    // Декодируем токен
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as number;
    const userRole = payload.role as string;

    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Доступ только для менеджеров" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { item_id, value, price, buyer_name, description, date } = body;

    if (!item_id || !value || !price || !buyer_name || !date) {
      return NextResponse.json(
        { error: "Все обязательные поля должны быть заполнены" },
        { status: 400 }
      );
    }

    if (value <= 0 || price <= 0) {
      return NextResponse.json(
        { error: "Количество и цена должны быть больше нуля" },
        { status: 400 }
      );
    }

    // Начинаем транзакцию
    const transaction = db.transaction(() => {
      // Проверяем, что товар принадлежит этому менеджеру
      const managerName = db
        .prepare("SELECT name FROM users WHERE id = ?")
        .get(userId) as { name: string } | undefined;

      if (!managerName) {
        throw new Error("Менеджер не найден");
      }

      // Получаем информацию о продаже администратора
      const originalSale = db
        .prepare(
          `
          SELECT s.*, o.measurement, o.order_number 
          FROM sales s
          JOIN orders o ON s.order_id = o.id
          WHERE s.id = ? AND s.buyer_name = ?
        `
        )
        .get(item_id, managerName.name) as any;

      if (!originalSale) {
        throw new Error("Товар не найден в вашем складе");
      }

      // Проверяем доступное количество
      const soldQuantity = db
        .prepare(
          `
          SELECT COALESCE(SUM(sale_value), 0) as total_sold 
          FROM manager_sales 
          WHERE related_sale_id = ? AND manager_id = ?
        `
        )
        .get(item_id, userId) as { total_sold: number };

      const availableQuantity =
        originalSale.sale_value - soldQuantity.total_sold;

      if (value > availableQuantity) {
        throw new Error(
          `Недостаточно товара. Доступно: ${availableQuantity} ${originalSale.measurement}`
        );
      }

      // Создаем запись о продаже менеджера
      const insertManagerSale = db.prepare(`
        INSERT INTO manager_sales (
          manager_id, related_sale_id, sale_value, sale_price, 
          buyer_name, description, date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const saleResult = insertManagerSale.run(
        userId,
        item_id,
        value,
        price,
        buyer_name,
        description || null,
        date
      );

      // Создаем займ для менеджера (доходы от продажи становятся займом)
      const partnerId = db
        .prepare("SELECT id FROM partners WHERE user_id = ?")
        .get(userId) as { id: number } | undefined;

      if (partnerId) {
        const insertLoan = db.prepare(`
          INSERT INTO loans (partner_id, amount, is_paid)
          VALUES (?, ?, false)
        `);
        insertLoan.run(partnerId.id, price);
      }

      // Логируем активность
      const insertLog = db.prepare(`
        INSERT INTO activity_logs (user_id, action, entity_type, details)
        VALUES (?, 'продажа_менеджера', 'manager_sale', ?)
      `);
      insertLog.run(
        userId,
        `Менеджер продал ${value} ${originalSale.measurement} товара "${originalSale.item_name}" за $${price}`
      );

      return saleResult.lastInsertRowid;
    });

    const saleId = transaction();

    return NextResponse.json({
      success: true,
      sale_id: saleId,
    });
  } catch (error: any) {
    console.error("Ошибка продажи товара менеджером:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка продажи товара" },
      { status: 500 }
    );
  }
}
