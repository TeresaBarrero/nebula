import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormularioRegistro } from './FormularioRegistro';

export const metadata: Metadata = { title: 'Crear usuario' };

export default function Registro() {
  return (
    <Suspense>
      <FormularioRegistro />
    </Suspense>
  );
}
