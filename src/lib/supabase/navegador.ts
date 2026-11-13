'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from './config';
import type { Database } from './tipos-bd';

let cliente: SupabaseClient<Database> | null = null;

/** Conexión con Supabase desde el navegador. La sesión viaja en cookies. */
export function supabaseNavegador(): SupabaseClient<Database> {
  if (!supabaseConfigurado) throw new Error('Supabase no está configurado todavía.');
  cliente ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return cliente;
}
