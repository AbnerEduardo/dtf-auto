import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths allowed without authentication
  const publicPaths = ['/login', '/cadastro', '/recuperar-senha', '/api/auth', '/api/webhooks', '/_next', '/favicon.ico', '/samples'];

  const isPublic = publicPaths.some(p => pathname.startsWith(p));
  if (isPublic) {
    return NextResponse.next();
  }

  // Check auth session cookies
  const sessionToken = request.cookies.get('dtf_session')?.value;
  const userIdCookie = request.cookies.get('dtf_user_id')?.value;

  if (!sessionToken && !userIdCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection: decode and verify admin permission
  if (pathname.startsWith('/admin')) {
    if (sessionToken) {
      try {
        const payloadBase64 = sessionToken.split('.')[1];
        if (payloadBase64) {
          const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
          const tokenData = JSON.parse(jsonStr);
          if (tokenData.role !== 'admin') {
            return NextResponse.redirect(new URL('/fila', request.url));
          }
        }
      } catch (e) {
        return NextResponse.redirect(new URL('/fila', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/fila/:path*',
    '/separacao/:path*',
    '/catalogo/:path*',
    '/clientes/:path*',
    '/assinatura/:path*',
    '/admin/:path*',
  ],
};
