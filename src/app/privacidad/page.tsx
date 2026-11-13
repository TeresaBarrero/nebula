import type { Metadata } from 'next';
import Link from 'next/link';
import { MarcoAcceso } from '@/components/acceso/MarcoAcceso';

export const metadata: Metadata = { title: 'Política de privacidad' };

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
          Este texto está <b>pendiente de redactar y revisar por un profesional</b>. Mientras tanto, nebúla está en pruebas y cada cuenta se aprueba a
          mano.
        </div>
        <p>Lo que ya podemos contarte:</p>
        <ul>
          <li>Tus datos se guardan en servidores de la Unión Europea.</li>
          <li>Cada cuenta solo puede ver sus propios datos.</li>
          <li>En el modo demostración no se envía nada: todo se queda en tu navegador.</li>
        </ul>
        <Link href="/entrar" className="text-link">
          ← Volver
        </Link>
      </section>
    </MarcoAcceso>
  );
}
