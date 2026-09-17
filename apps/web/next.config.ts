import type { NextConfig } from 'next';

const apiUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
// Optional sub-path deployment, e.g. NEXT_BASE_PATH=/mirage-manage (set at build time).
const basePath = (process.env.NEXT_BASE_PATH ?? '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  transpilePackages: ['@grm/shared'],
  poweredByHeader: false,
  // The browser only talks to this origin; /api/* is proxied to NestJS so the httpOnly auth cookie
  // is first-party and no CORS is needed.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
