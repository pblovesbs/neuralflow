import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware — Auto-redirect returning users from `/` to their preferred mode.
 * Reads the `nf-mode` cookie set by modeStore.ts.
 * If no cookie exists, the user sees the landing page to choose.
 */
export function middleware(request: NextRequest) {
  // The user requested that we always show the home page first so they can choose
  // We no longer automatically redirect based on the nf-mode cookie.
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
