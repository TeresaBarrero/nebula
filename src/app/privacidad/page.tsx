import type { Metadata } from 'next';
import Link from 'next/link';
import { MarcoAcceso } from '@/components/acceso/MarcoAcceso';

export const metadata: Metadata = { title: 'Política de privacidad' };

/** Responsable y email público para dudas y para pedir que se borren tus datos. */
const RESPONSABLE = 'María Teresa Barrero Isidoro';
const CONTACTO = 'mariateresabi98@gmail.com';

/**
 * Política de privacidad de la demo de portfolio. Si algún día se abre el registro al público
 * (cuentas reales, facturas, portal de clientes y cobros), habrá que ampliarla y revisarla con un profesional.
 */
export default function Privacidad() {
  const mail = <a className="text-link" href={`mailto:${CONTACTO}`}>{CONTACTO}</a>;
  return (
    <MarcoAcceso ancho={640}>
      <section className="card acceso-tarjeta">
        <h1>Política de privacidad</h1>
        <p className="muted">Última actualización: 18 de noviembre de 2026</p>
        <p>
          nebúla es una <b>demostración de portfolio</b> de {RESPONSABLE}, que es la responsable de tus datos. Todavía no se pueden crear cuentas.
          Para cualquier duda, escribe a {mail}.
        </p>

        <h2>En el modo demostración</h2>
        <ul>
          <li>No necesitas registrarte y no se envía nada: los datos de ejemplo y tus cambios se quedan solo en tu navegador.</li>
          <li>No usamos cookies de publicidad ni de analítica.</li>
        </ul>

        <h2>Si te apuntas en «Me interesa»</h2>
        <ul>
          <li>Guardamos tu nombre y tu email. Si nos los das, también a qué te dedicas, cómo trabajas y tu comentario.</li>
          <li>Solo los usamos para avisarte cuando nebúla esté disponible y para saber qué te gustaría que hiciera. La base legal es tu consentimiento al enviar el formulario.</li>
          <li>Solo los ve la persona que gestiona nebúla. No los compartimos ni los vendemos.</li>
          <li>Los guardamos hasta que nebúla esté disponible y te hayamos avisado, o hasta que nos pidas borrarlos.</li>
        </ul>

        <h2>Dónde se guardan</h2>
        <p>
          La web está alojada en Vercel y los datos se guardan en Supabase, en servidores de la Unión Europea. Son los proveedores técnicos que hacen
          funcionar nebúla y solo tratan los datos para prestar ese servicio.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes pedir en cualquier momento ver, corregir o borrar tus datos. También puedes oponerte a su uso, limitarlo o pedir una copia. Para ello,
          escribe a {mail}. Si no te respondemos bien, puedes reclamar ante la{' '}
          <a className="text-link" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos</a>.
        </p>

        <Link href="/entrar" className="text-link">
          ← Volver
        </Link>
      </section>
    </MarcoAcceso>
  );
}
