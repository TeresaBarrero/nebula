import { Carcasa } from '@/components/app/Carcasa';
import { ProveedorNebula } from '@/components/app/Nebula';
import { ProveedorToasts } from '@/components/ui/Toasts';

// Los datos se cargan en el navegador (demo en localStorage o Supabase con la sesión del usuario):
// esta zona no se puede pre-dibujar en el servidor, así que se excluye de la validación de navegación instantánea.
export const instant = false;

function Cargando() {
  return (
    <div className="pantalla-centro" aria-busy="true" aria-live="polite">
      <span className="logo cargando-logo">nebúla</span>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

/** Todo lo que está dentro de la app (con sesión o en modo demostración). */
export default function LayoutApp({ children }: LayoutProps<'/'>) {
  return (
    <ProveedorToasts>
      <ProveedorNebula cargando={<Cargando />}>
        <Carcasa>{children}</Carcasa>
      </ProveedorNebula>
    </ProveedorToasts>
  );
}
