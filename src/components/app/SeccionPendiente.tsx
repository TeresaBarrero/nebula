import type { Metadata } from 'next';
import { seccion } from '@/lib/catalogos/nav';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

export function metaSeccion(id: string): Metadata {
  return { title: seccion(id)?.label ?? 'nebúla' };
}

/** Página de una sección que todavía no funciona: explica qué hará y en qué fase llega. */
export function SeccionPendiente({ id }: { id: string }) {
  const s = seccion(id);
  if (!s) return null;
  return (
    <>
      <Cabecera antetitulo={s.antetitulo} titulo={s.label} />
      <section className="card proximamente">
        <span className="tl-ic peach grande">
          <Icono n={s.icon} />
        </span>
        <h2>
          {s.label} llega en la Fase {s.fase}
        </h2>
        <p className="muted">{s.desc}</p>
        <span className="pill mist">Fase {s.fase} de 5</span>
      </section>
    </>
  );
}
