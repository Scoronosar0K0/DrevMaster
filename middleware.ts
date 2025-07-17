import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "drevmaster-secret-key-2024"
);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Разрешаем доступ к странице логина и API логина
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  // Разрешаем доступ к статическим файлам
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Проверяем токен из cookie
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return verifyToken(token, request);
}

async function verifyToken(token: string, request: NextRequest) {
  try {
    // Проверяем валидность токена с помощью jose
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;
    const { pathname } = request.nextUrl;

    // Ограничения для менеджеров
    if (userRole === "manager") {
      // Страницы, к которым менеджеры НЕ должны иметь доступ
      const restrictedPaths = [
        "/partners",
        "/suppliers",
        "/cash",
        "/managers",
        "/orders",
        "/history",
      ];

      // Если менеджер пытается получить доступ к запрещенной странице
      if (restrictedPaths.some((path) => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL("/manager", request.url));
      }

      // Перенаправляем менеджеров с главной страницы на их dashboard
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/manager", request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Если токен недействительный, перенаправляем на логин
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
