import { NextRequest, NextResponse } from 'next/server';

// httpOnly refresh-token cookie (server tomonidan /auth/login,.../auth/refresh
// javoblarida o'rnatiladi). Access token endi JS-o'qiladigan cookie'da
// saqlanmaydi (xotirada turadi), shuning uchun middleware faqat refresh
// cookie mavjudligini tekshiradi — bu hali "amaldagi sessiya bormi" degani,
// aniq tekshiruv (muddati, revoke holati) client tomonda /auth/me orqali
// bo'ladi. Role tekshiruvi ham client tomonda qoladi.
const REFRESH_COOKIE = 'mx_refresh';

// /login va /register — sessiya cookie'si bor foydalanuvchi bu sahifalarni
// qayta ko'rmasin (masalan yangi tab'da manzilni qo'lda yozib kirsa).
// Aniq rol tekshiruvi (ADMIN → /admin) middleware'da mumkin emas — access
// token faqat xotirada, cookie'da rol yo'q — shuning uchun /dashboard'ga
// yo'naltiradi, xato bo'lsa dashboard layout /auth/me orqali o'zi qayta
// tekshiradi va kerak bo'lsa /login'ga qaytaradi.
const AUTH_ONLY_ROUTES = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE);
  const { pathname } = request.nextUrl;

  if (AUTH_ONLY_ROUTES.some((p) => pathname.startsWith(p))) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/websites/:path*',
    '/connections/:path*',
    '/posts/:path*',
    '/insights/:path*',
    '/alerts/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
