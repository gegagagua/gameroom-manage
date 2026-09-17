import type { NextConfig } from 'next';

const apiUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@grm/shared'],
  poweredByHeader: false,
  // The browser only talks to this origin; /api/* is proxied to NestJS so the httpOnly auth cookie
  // is first-party and no CORS is needed.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
