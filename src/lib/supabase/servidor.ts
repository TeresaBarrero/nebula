import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_KEY, SUPABASE_URL } from './config';
import type { Database } from './tipos-bd';

/** Conexión con Supabase en el servidor (acciones y rutas). Una nueva en cada petición. */
export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Desde un componente de servidor no se pueden escribir cookies; el proxy se encarga.
        }
      },
    },
  });
}
