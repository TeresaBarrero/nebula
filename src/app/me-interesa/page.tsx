import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormularioInteres } from './FormularioInteres';

export const metadata: Metadata = { title: 'Me interesa' };

export default function MeInteresa() {
  return (
    <Suspense>
      <FormularioInteres />
    </Suspense>
  );
}
