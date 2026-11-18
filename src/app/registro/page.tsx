import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { REGISTRO_ABIERTO } from '@/lib/lanzamiento';
import { FormularioRegistro } from './FormularioRegistro';

export const metadata: Metadata = { title: 'Crear usuario' };

export default async function Registro({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  // Mientras nebúla es una demo de portfolio no se crean cuentas: se apunta a la lista de interesados.
  if (!REGISTRO_ABIERTO) redirect((await searchParams).desde === 'demo' ? '/me-interesa?desde=demo' : '/me-interesa');
  return (
    <Suspense>
      <FormularioRegistro />
    </Suspense>
  );
}
