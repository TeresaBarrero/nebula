'use client';

import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { Disciplina } from '@/lib/catalogos/disciplinas';
import { FormularioWeb } from '@/components/cliente/FormularioWeb';

/** Formulario público para incrustar en tu web (con un iframe). */
export default function Pagina() {
  return (
    <Suspense>
      <Formulario />
    </Suspense>
  );
}

function Formulario() {
  const { slug } = useParams<{ slug: string }>();
  const [info, setInfo] = useState<{ estudio: string; disciplinas: Disciplina[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(`/api/formulario/${slug}`)
      .then(async (r) => (r.ok ? setInfo(await r.json()) : setError(true)))
      .catch(() => setError(true));
  }, [slug]);
  return (
    <main style={{ padding: 16, maxWidth: 680, margin: '0 auto' }}>
      {error ? (
        <p className="muted">Este formulario no está disponible.</p>
      ) : info ? (
        <FormularioWeb
          disciplinas={info.disciplinas.length ? info.disciplinas : ['grafico']}
          alEnviar={async (e) => {
            const r = await fetch(`/api/formulario/${slug}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) }).catch(() => null);
            return (r && (await r.json().catch(() => null))) ?? { ok: false, mensaje: 'No se ha podido enviar. Inténtalo de nuevo.' };
          }}
        />
      ) : (
        <p className="muted">Cargando…</p>
      )}
    </main>
  );
}
