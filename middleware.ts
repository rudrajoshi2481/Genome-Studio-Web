import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple configuration
const PUBLIC_PATHS = ['/login', '/register', '/auth'];
const PROTECTED_PATHS = ['/', '/dashboard'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;
  
  // Simple checks
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const isProtected = PROTECTED_PATHS.includes(pathname);
  const isAuthenticated = token && token.length > 20; // JWT tokens are typically longer
  
  console.log(`[Auth] ${pathname} - Auth: ${!!isAuthenticated}`);
  
  // Redirect logic
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Add auth header for API calls
  if (pathname.startsWith('/api') && isAuthenticated) {
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return NextResponse.next({ request: { headers } });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)',]
};
