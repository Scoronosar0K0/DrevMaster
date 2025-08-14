import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db, initDatabase } from "@/lib/database";

initDatabase();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
);

export async function GET(request: NextRequest) {
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

    // Получаем имя менеджера
    const userResult = db
      .prepare("SELECT name FROM users WHERE id = ?")
      .get(userId) as { name: string } | undefined;

    if (!userResult) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const managerName = userResult.name;

    // Получаем товары склада для этого менеджера
    // Ищем продажи администратора этому менеджеру по займам
    const warehouseItems = db
      .prepare(
        `
        SELECT 
          s.id,
          s.order_id,
          o.order_number,
          sup.name as supplier_name,
          si.name as item_name,
          s.sale_value,
          s.sale_price,
          o.measurement,
          s.description,
          s.date as sale_date,
          o.status,
          l.amount as loan_amount,
          l.is_paid as loan_paid,
          -- Вычисляем остаток товара (изначально проданное количество минус уже перепроданное)
          (s.sale_value - COALESCE(sold_sum.total_sold, 0)) as remaining_value
        FROM sales s
        JOIN orders o ON s.order_id = o.id
        JOIN suppliers sup ON o.supplier_id = sup.id
        JOIN supplier_items si ON o.item_id = si.id
        -- Соединяем с займами через партнера менеджера
        JOIN loans l ON l.order_id = o.id
        JOIN partners p ON l.partner_id = p.id
        -- Подсчитываем уже проданное менеджером количество
        LEFT JOIN (
          SELECT 
            related_sale_id,
            SUM(sale_value) as total_sold
          FROM manager_sales
          WHERE manager_id = ?
          GROUP BY related_sale_id
        ) sold_sum ON s.id = sold_sum.related_sale_id
        WHERE p.user_id = ?
        AND s.buyer_name = ?
        AND (s.sale_value - COALESCE(sold_sum.total_sold, 0)) > 0
        ORDER BY s.date DESC
      `
      )
      .all(userId, userId, managerName);

    return NextResponse.json(warehouseItems);
  } catch (error) {
    console.error("Ошибка получения товаров склада менеджера:", error);
    return NextResponse.json(
      { error: "Ошибка получения товаров склада" },
      { status: 500 }
    );
  }
}
