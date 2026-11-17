'use client';

import { useParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import type { Fecha } from '@/lib/datos/entidades';
import { Reservas } from '@/components/cliente/Reservas';

type Info = { estudio: string; duracion: number; huecos: { fecha: Fecha; horas: string[] }[] };

/** Página pública de reservas: /reservar/<nombre-del-estudio>. */
export default function Pagina() {
  return (
    <Suspense>
      <PaginaReservas />
    </Suspense>
  );
}

function PaginaReservas() {
  const { slug } = useParams<{ slug: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState(false);
  const cargar = useCallback(() => {
    fetch(`/api/reservar/${slug}`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? setInfo(await r.json()) : setError(true)))
      .catch(() => setError(true));
  }, [slug]);
  useEffect(cargar, [cargar]);
  return (
    <div className="portal" style={{ position: 'static', minHeight: '100dvh' }}>
      <div className="pt-wrap">
        <header className="pt-head">
          <span className="logo" style={{ fontSize: 30 }}>
            nebúla
          </span>
          <span className="muted">Reserva una reunión</span>
        </header>
        <section className="pt-card">
          {error ? (
            <p className="muted">Esta página de reservas no está disponible.</p>
          ) : info ? (
            <Reservas
              estudio={info.estudio}
              duracion={info.duracion}
              huecos={info.huecos}
              alReservar={async (e) => {
                const r = await fetch(`/api/reservar/${slug}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) }).catch(() => null);
                const j = (r && (await r.json().catch(() => null))) ?? { ok: false, mensaje: 'No se ha podido reservar. Inténtalo de nuevo.' };
                if (!j.ok) cargar();
                return j;
              }}
            />
          ) : (
            <p className="muted">Cargando huecos libres…</p>
          )}
        </section>
      </div>
    </div>
  );
}
