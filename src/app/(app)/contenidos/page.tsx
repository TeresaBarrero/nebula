import { SeccionPendiente, metaSeccion } from '@/components/app/SeccionPendiente';

// Pendiente: esta sección se construye en su fase (ver SPEC §12).
export const metadata = metaSeccion('contenidos');

export default function Page() {
  return <SeccionPendiente id="contenidos" />;
}
