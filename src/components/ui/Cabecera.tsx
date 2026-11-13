import type { ReactNode } from 'react';

/** Cabecera de página del prototipo: «eyebrow», título, subtítulo y acciones. */
export function Cabecera({
  antetitulo,
  titulo,
  children,
  acciones,
  className = '',
}: {
  antetitulo: string;
  titulo: ReactNode;
  children?: ReactNode;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ph ${className}`}>
      <div>
        <div className="eyebrow">{antetitulo}</div>
        <h1>{titulo}</h1>
        {children && <p>{children}</p>}
      </div>
      {acciones && <div className="ph-actions">{acciones}</div>}
    </div>
  );
}
