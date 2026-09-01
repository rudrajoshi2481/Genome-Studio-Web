// Copyright (c) 2026 Rudhra Joshi and Yong Chen.
// Licensed under CC BY-NC 4.0. Developed with partial support from the
// National Science Foundation under CAREER Award DBI-2239350.

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
  '/api/v1/token',   
  '/api/v1/register',
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
  const token = request.cookies.get('bioinformatics_studio_token')?.value;

  // Also check for token in query params — this allows opening authenticated
  // pages in new windows (e.g. /editor-window?path=...&token=... or
  // /terminal-window?tabId=...&token=...) where SameSite=Strict cookies
  // are not sent on the initial navigation.
  const queryToken = request.nextUrl.searchParams.get('token');

  // Debug logging
  console.log(`[Auth] ${pathname} - Public: ${isPublicPath}, Static: ${isStaticAsset}, API: ${isApiRoute}, Cookie Token: ${!!token}, Query Token: ${!!queryToken}`);
  
  // Special handling for root path - redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the path is public or a static asset, allow access
  if (isPublicPath || isStaticAsset) {
    return NextResponse.next();
  }
  
  // If there's no token (cookie or query) and the path requires authentication, redirect to login
  if (!token && !queryToken && !isApiRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // If there's no token and it's an API route, return 401
  if (!token && !queryToken && isApiRoute) {
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  // If we have a query token but no cookie, set the cookie on the response
  // so subsequent requests (API calls, etc.) are authenticated.
  if (!token && queryToken) {
    const response = NextResponse.next();
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    response.cookies.set('bioinformatics_studio_token', queryToken, {
      path: '/',
      maxAge,
      sameSite: 'strict',
    });
    return response;
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
