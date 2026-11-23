import type { NextConfig } from 'next';

const apiUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
// Optional sub-path deployment, e.g. NEXT_BASE_PATH=/landing (set at build time).
const basePath = (process.env.NEXT_BASE_PATH ?? '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  transpilePackages: ['@grm/shared'],
  poweredByHeader: false,
  experimental: { globalNotFound: true },
  async rewrites() {
    return [
      // Only the public booking endpoints are reachable through this site.
      { source: '/api/public/:path*', destination: `${apiUrl}/api/public/:path*` },
      // English is the default language and lives at the root URL.
      { source: '/', destination: '/en' },
    ];
  },
  async redirects() {
    return [{ source: '/en', destination: '/', permanent: true }];
  },
};

export default nextConfig;
