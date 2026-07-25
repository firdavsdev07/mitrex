import { NextRequest, NextResponse } from 'next/server';

// httpOnly refresh-token cookie (server tomonidan /auth/login,.../auth/refresh
// javoblarida o'rnatiladi). Access token endi JS-o'qiladigan cookie'da
// saqlanmaydi (xotirada turadi), shuning uchun middleware faqat refresh
// cookie mavjudligini tekshiradi — bu hali "amaldagi sessiya bormi" degani,
// aniq tekshiruv (muddati, revoke holati) client tomonda /auth/me orqali
// bo'ladi. Role tekshiruvi ham client tomonda qoladi.
const REFRESH_COOKIE = 'mx_refresh';

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE);
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
  ],
};
