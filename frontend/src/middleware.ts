import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware — Auto-redirect returning users from `/` to their preferred mode.
 * Reads the `nf-mode` cookie set by modeStore.ts.
 * If no cookie exists, the user sees the landing page to choose.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept the root path
  if (pathname !== '/') {
    return NextResponse.next();
  }

  const modeCookie = request.cookies.get('nf-mode')?.value;

  if (modeCookie === 'standard') {
    return NextResponse.redirect(new URL('/standard', request.url));
  }

  if (modeCookie === 'builder') {
    return NextResponse.redirect(new URL('/builder', request.url));
  }

  // No cookie → show the landing page
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
