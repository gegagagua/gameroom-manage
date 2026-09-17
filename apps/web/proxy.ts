import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic auth check: no cookie → /login. The real check (valid JWT + role) happens in the API;
 * the client-side gate (components/auth-gate.tsx) redirects on 401 or wrong role.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get('grm_token')?.value) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/me/:path*'],
};
