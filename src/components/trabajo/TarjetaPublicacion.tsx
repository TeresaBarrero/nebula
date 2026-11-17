'use client';

import { CANALES, ESTADOS_PUBLICACION } from '@/lib/catalogos/trabajo';
import type { Publicacion } from '@/lib/datos/entidades';
import { relativa } from '@/lib/reglas/fechas';
import { useDatos } from '@/components/app/Datos';
import { useFormularios } from '@/components/app/formularios/Formulario';
import { Pill } from '@/components/crm/comunes';

/** Tarjeta de publicación (postChip del prototipo). */
export function TarjetaPublicacion({ p, arrastrable }: { p: Publicacion; arrastrable?: boolean }) {
  const { c, hoy } = useDatos();
  const abrir = useFormularios();
  return (
    <button
      type="button"
      className={`post ${CANALES[p.channel].cls}`}
      draggable={arrastrable || undefined}
      onDragStart={
        arrastrable
          ? (e) => {
              e.dataTransfer.setData('text/plain', p.id);
              e.dataTransfer.effectAllowed = 'move';
            }
          : undefined
      }
      onClick={() => abrir('post', { id: p.id })}
    >
      <span className="post-h">
        <b>{CANALES[p.channel].label}</b>
        <span>
          {relativa(p.date, hoy)}
          {p.time ? ` · ${p.time}` : ''}
        </span>
      </span>
      <span className="post-t">{p.title}</span>
      <span className="post-f">
        <span>{c.companies.find((e) => e.id === p.companyId)?.name ?? 'Mi marca'}</span>
        <Pill cls={ESTADOS_PUBLICACION[p.status].cls}>{ESTADOS_PUBLICACION[p.status].label}</Pill>
      </span>
    </button>
  );
}
