import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'nebúla',
    short_name: 'nebúla',
    description: 'El CRM para profesionales creativos 360º.',
    lang: 'es-ES',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f5f1',
    theme_color: '#d3dfcd',
    icons: [
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
