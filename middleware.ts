import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// true, если путь равен prefix или вложен в него ("/api/users" и "/api/users/5",
// но не "/api/users-old")
function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

// Страницы, к которым менеджеры НЕ должны иметь доступ
const MANAGER_RESTRICTED_PAGES = [
  "/partners",
  "/suppliers",
  "/cash",
  "/managers",
  "/analytics",
  "/orders",
  "/history",
];

// Страницы только для администратора
const ADMIN_ONLY_PAGES = ["/managers", "/analytics"];

// Изменение собственного профиля доступно всем ролям,
// маршрут сам проверяет, что id совпадает с текущим пользователем
function isOwnProfileUpdate(pathname: string, method: string) {
  return method === "PUT" && /^\/api\/users\/\d+$/.test(pathname);
}

function isApiAllowed(pathname: string, method: string, role: string) {
  if (role === "admin") return true;
  if (under(pathname, "/api/auth")) return true;
  if (isOwnProfileUpdate(pathname, method)) return true;

  if (role === "manager") {
    return (
      under(pathname, "/api/manager") ||
      under(pathname, "/api/manager-transfers") ||
      (method === "GET" && pathname === "/api/partners")
    );
  }

  // Прочие роли: всё, кроме административных разделов
  if (
    under(pathname, "/api/admin") ||
    under(pathname, "/api/analytics") ||
    under(pathname, "/api/users")
  ) {
    return false;
  }
  if (under(pathname, "/api/managers") && method !== "GET") return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = under(pathname, "/api");

  // Разрешаем доступ к странице логина и API логина/выхода
  if (under(pathname, "/login") || pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  // Разрешаем доступ к статическим файлам
  if (
    !isApi &&
    (pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname.includes("."))
  ) {
    return NextResponse.next();
  }

  const user = await getSessionUser(request);

  if (!user) {
    if (isApi) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isApi) {
    if (!isApiAllowed(pathname, request.method, user.role)) {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Ограничения для менеджеров
  if (user.role === "manager") {
    if (MANAGER_RESTRICTED_PAGES.some((path) => under(pathname, path))) {
      return NextResponse.redirect(new URL("/manager", request.url));
    }

    // Перенаправляем менеджеров с главной страницы на их dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/manager", request.url));
    }
  } else if (
    user.role !== "admin" &&
    ADMIN_ONLY_PAGES.some((path) => under(pathname, path))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Все пути, кроме:
     * - _next/static (статические файлы)
     * - _next/image (оптимизация изображений)
     * - favicon.ico
     * API-маршруты теперь тоже проходят через middleware
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
