import type { Metadata } from 'next';
import Link from 'next/link';
import { MarcoAcceso } from '@/components/acceso/MarcoAcceso';

export const metadata: Metadata = { title: 'Política de privacidad' };

/** Email público para pedir que se borren tus datos (PENDIENTE: lo decide la persona responsable). */
const CONTACTO = '';

/**
 * PENDIENTE (legal): el texto de la política de privacidad y las condiciones de uso
 * tiene que redactarlo o revisarlo un profesional antes de abrir el registro al público.
 */
export default function Privacidad() {
  return (
    <MarcoAcceso ancho={640}>
      <section className="card acceso-tarjeta">
        <h1>Política de privacidad</h1>
        <div className="warn butter">
          Este texto está <b>pendiente de redactar y revisar por un profesional</b>. Mientras tanto, nebúla es una demostración y no se pueden crear
          cuentas.
        </div>
        <p>Lo que ya podemos contarte:</p>
        <ul>
          <li>En el modo demostración no se envía nada: todo se queda en tu navegador.</li>
          <li>Tus datos se guardan en servidores de la Unión Europea.</li>
        </ul>
        <h2>Si te apuntas en «Me interesa»</h2>
        <ul>
          <li>Guardamos tu nombre, tu email y, si nos los das, a qué te dedicas, cómo trabajas y tu comentario.</li>
          <li>Solo los usamos para avisarte cuando nebúla esté disponible y para saber qué te gustaría que hiciera. No los compartimos ni los vendemos.</li>
          <li>Solo los ve la persona que gestiona nebúla.</li>
          <li>Puedes pedir en cualquier momento que los borremos{CONTACTO ? <>, escribiendo a <a className="text-link" href={`mailto:${CONTACTO}`}>{CONTACTO}</a></> : ''}.</li>
        </ul>
        <Link href="/entrar" className="text-link">
          ← Volver
        </Link>
      </section>
    </MarcoAcceso>
  );
}
