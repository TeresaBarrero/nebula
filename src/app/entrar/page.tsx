import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormularioEntrar } from './FormularioEntrar';

export const metadata: Metadata = { title: 'Entrar' };

export default function Entrar() {
  return (
    <Suspense>
      <FormularioEntrar />
    </Suspense>
  );
}
