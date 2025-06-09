import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { endpoints } from './lib/utils/api-config';

// Define paths that don't require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
];

/**
 * Middleware function to handle authentication
 * This runs before each request to check if the user is authenticated
 */
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;
  
  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || (path !== '/' && pathname.startsWith(path))
  );
  
  // Check if the request is for an API route
  const isApiRoute = pathname.startsWith('/api/');
  
  // Check if the request is for static assets
  const isStaticAsset = /\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2|ttf|eot)$/i.test(pathname);
  
  // Get the token from cookies
  const token = request.cookies.get('genome_studio_token')?.value;
  
  // Debug logging
  console.log(`[Auth] ${pathname} - Public: ${isPublicPath}, Static: ${isStaticAsset}, API: ${isApiRoute}, Token: ${!!token}`);
  
  // Special handling for root path - redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the path is public or a static asset, allow access
  if (isPublicPath || isStaticAsset) {
    return NextResponse.next();
  }
  
  // If there's no token and the path requires authentication, redirect to login
  if (!token && !isApiRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }
  
  // If there's no token and it's an API route, return 401
  if (!token && isApiRoute) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }
  
  // If there's a token, allow the request to proceed
  return NextResponse.next();
}

// Configure which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
