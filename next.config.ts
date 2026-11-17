import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // La raíz del proyecto es esta carpeta (evita que Next.js busque en carpetas superiores).
    root: process.cwd(),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  poweredByHeader: false,
  experimental: {
    // La app carga los datos en el navegador (la demo vive en él), así que solo se validan
    // las rutas marcadas a mano con `instant`.
    instantInsights: { validationLevel: 'manual-warning' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Nadie puede meter nebúla dentro de otra web… salvo el formulario, que está hecho para eso.
      { source: '/((?!formulario/).*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] },
      { source: '/formulario/:slug', headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default nextConfig;
