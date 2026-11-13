// Genera los iconos de la app instalable (PWA) con el logo «n.» en Caveat sobre salvia.
// Uso: node scripts/generar-iconos.mjs   (Caveat: SIL Open Font License)
import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og.js';

const raiz = path.resolve(import.meta.dirname, '..');
const fuente = fs.readFileSync(path.join(raiz, 'scripts/caveat-700.ttf'));
const SALVIA = '#d3dfcd', TINTA = '#2f4a2d', MELOCOTON = '#ec9473';

async function icono(tam, { margen = 0, redondo = true } = {}) {
  const lado = tam * (1 - margen * 2);
  const el = {
    type: 'div',
    props: {
      style: { width: tam, height: tam, display: 'flex', alignItems: 'center', justifyContent: 'center', background: redondo ? 'transparent' : SALVIA },
      children: {
        type: 'div',
        props: {
          style: {
            width: redondo ? tam : lado, height: redondo ? tam : lado, borderRadius: redondo ? tam * 0.22 : 0, background: SALVIA,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Caveat', color: TINTA,
            fontSize: lado * 1.2, lineHeight: 1, paddingBottom: lado * 0.2,
          },
          children: [
            { type: 'span', props: { children: 'n' } },
            { type: 'span', props: { style: { color: MELOCOTON }, children: '.' } },
          ],
        },
      },
    },
  };
  const r = new ImageResponse(el, { width: tam, height: tam, fonts: [{ name: 'Caveat', data: fuente, weight: 700, style: 'normal' }] });
  return Buffer.from(await r.arrayBuffer());
}

const salida = [
  ['public/iconos/icono-192.png', await icono(192)],
  ['public/iconos/icono-512.png', await icono(512)],
  // «maskable»: el móvil recorta la forma; el dibujo va más pequeño y el fondo llena todo.
  ['public/iconos/icono-maskable-512.png', await icono(512, { margen: 0.12, redondo: false })],
  ['src/app/apple-icon.png', await icono(180, { redondo: false })],
  ['src/app/icon.png', await icono(64)],
];
for (const [f, buf] of salida) {
  fs.writeFileSync(path.join(raiz, f), buf);
  console.log('✓', f, buf.length, 'bytes');
}
