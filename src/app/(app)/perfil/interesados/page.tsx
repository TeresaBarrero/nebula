'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Database } from '@/lib/supabase/tipos-bd';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { useNebula } from '@/components/app/Nebula';
import { descargar } from '@/components/crm/ProteccionDatos';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';
import { useToast } from '@/components/ui/Toasts';

type Interesado = Database['public']['Tables']['interesados']['Row'];

const fecha = (s: string) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s));
const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** Solo para quien administra nebúla: la lista de personas que han pulsado «Me interesa». */
export default function Interesados() {
  const { esAdmin } = useNebula();
  const toast = useToast();
  const [lista, setLista] = useState<Interesado[] | null>(null);
  const [version, setVersion] = useState(0);
  const [borrando, setBorrando] = useState<string | null>(null);

  useEffect(() => {
    if (!esAdmin) return;
    supabaseNavegador()
      .from('interesados')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast('No se ha podido cargar la lista');
        setLista(data ?? []);
      });
  }, [esAdmin, toast, version]);
  const cargar = () => setVersion((v) => v + 1);

  const marcar = async (i: Interesado) => {
    const { error } = await supabaseNavegador().from('interesados').update({ contacted: !i.contacted }).eq('id', i.id);
    if (error) return toast('No se ha podido guardar. Inténtalo de nuevo.');
    cargar();
  };
  const borrar = async (i: Interesado) => {
    const { error } = await supabaseNavegador().from('interesados').delete().eq('id', i.id);
    setBorrando(null);
    if (error) return toast('No se ha podido borrar. Inténtalo de nuevo.');
    toast(`${i.name} ya no está en la lista`);
    cargar();
  };
  const copiarEmails = () => {
    const emails = (lista ?? []).map((i) => i.email).join(', ');
    void navigator.clipboard?.writeText(emails).then(
      () => toast('Emails copiados: pégalos en «Para» o, mejor, en «CCO» para que no se vean entre sí'),
      () => toast('No se han podido copiar'),
    );
  };
  const exportar = () => {
    const filas = [['Nombre', 'Email', 'Se dedica a', 'Cómo trabaja', 'Comentario', 'Fecha', 'Contactado']];
    for (const i of lista ?? []) filas.push([i.name, i.email, i.discipline, i.kind, i.comment, fecha(i.created_at), i.contacted ? 'Sí' : 'No']);
    descargar('nebula-interesados.csv', '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n'), 'text/csv');
  };

  if (!esAdmin)
    return (
      <>
        <Cabecera antetitulo="Cuenta" titulo="Interesados" />
        <section className="card">
          <div className="empty">Esta página solo la ve quien administra nebúla.</div>
        </section>
      </>
    );

  return (
    <>
      <Cabecera
        antetitulo="Cuenta"
        titulo="Interesados"
        acciones={
          <>
            {!!lista?.length && (
              <>
                <button type="button" className="btn" onClick={copiarEmails}>
                  <Icono n="copy" />
                  Copiar emails
                </button>
                <button type="button" className="btn" onClick={exportar}>
                  <Icono n="download" />
                  Descargar (CSV)
                </button>
              </>
            )}
            <Link href="/perfil" className="btn ghost">
              <Icono n="left" />
              Volver al perfil
            </Link>
          </>
        }
      >
        Personas que han pulsado «Me interesa» en la página de entrada o en la demo. Te llega un correo cada vez que alguien se apunta.
      </Cabecera>
      <section className="card">
        {lista === null ? (
          <div className="empty">Cargando…</div>
        ) : !lista.length ? (
          <div className="empty">Todavía no se ha apuntado nadie.</div>
        ) : (
          <div className="list">
            {lista.map((i) => (
              <div className="follow solicitud" key={i.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{i.name}</b>
                  <div className="tags" style={{ marginTop: 4 }}>
                    <a className="chip" href={`mailto:${i.email}`}>
                      {i.email}
                    </a>
                    {i.discipline && <span className="chip">{i.discipline}</span>}
                    {i.kind && <span className="chip">{i.kind}</span>}
                    <span className="chip">Se apuntó el {fecha(i.created_at)}</span>
                  </div>
                  {i.comment && (
                    <p className="muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                      «{i.comment}»
                    </p>
                  )}
                </div>
                <span className={`pill ${i.contacted ? 'sage' : 'butter'}`}>{i.contacted ? 'Contactado' : 'Sin contactar'}</span>
                <div className="r-actions">
                  <button type="button" className="btn sm" onClick={() => void marcar(i)}>
                    <Icono n="tick" />
                    {i.contacted ? 'Marcar sin contactar' : 'Marcar contactado'}
                  </button>
                  {borrando === i.id ? (
                    <button type="button" className="btn sm" onClick={() => void borrar(i)}>
                      <Icono n="trash" />
                      Sí, borrar
                    </button>
                  ) : (
                    <button type="button" className="icon-btn" aria-label={`Borrar a ${i.name} de la lista`} title="Borrar de la lista" onClick={() => setBorrando(i.id)}>
                      <Icono n="trash" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
