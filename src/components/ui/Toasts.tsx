'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Toast = { id: number; msg: string; accion?: { label: string; fn: () => void } };
type Lanzar = (msg: string, accion?: Toast['accion']) => void;

const Ctx = createContext<Lanzar>(() => {});

/** Avisos breves abajo en el centro, con «Deshacer» opcional (SPEC §8.4). */
export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const n = useRef(0);

  const lanzar = useCallback<Lanzar>((msg, accion) => {
    const id = ++n.current;
    setLista((l) => [...l.slice(-2), { id, msg, accion }]);
    setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), accion ? 6000 : 3600);
  }, []);

  return (
    <Ctx value={lanzar}>
      {children}
      <div className="toasts" aria-live="polite">
        {lista.map((t) => (
          <div className="toast" key={t.id} role="status">
            <span>{t.msg}</span>
            {t.accion && (
              <button
                type="button"
                onClick={() => {
                  t.accion?.fn();
                  setLista((l) => l.filter((x) => x.id !== t.id));
                }}
              >
                {t.accion.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx>
  );
}

export function useToast(): Lanzar {
  return useContext(Ctx);
}
