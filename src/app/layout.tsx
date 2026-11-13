import type { Metadata, Viewport } from 'next';
import { Caveat, Manrope, Outfit } from 'next/font/google';
import { RegistrarSW } from '@/components/RegistrarSW';
import './globals.css';

// Las fuentes se descargan al publicar y se sirven desde la propia web (no se llama a Google desde el navegador).
const caveat = Caveat({ variable: '--font-caveat', subsets: ['latin'], weight: ['600', '700'] });
const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'], weight: ['300', '400', '500', '600'] });
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: { default: 'nebúla', template: '%s · nebúla' },
  description: 'El CRM para profesionales creativos 360º.',
  applicationName: 'nebúla',
  appleWebApp: { capable: true, title: 'nebúla', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#d3dfcd' },
    { media: '(prefers-color-scheme: dark)', color: '#151916' },
  ],
};

// Aplica el tema y el menú plegado antes de pintar, para que no haya parpadeo.
const SCRIPT_TEMA = `(function(){try{var d=document.documentElement,t=localStorage.getItem('nebula-tema');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);if(localStorage.getItem('nebula-compacto')==='1')d.setAttribute('data-compact','1')}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${caveat.variable} ${outfit.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
