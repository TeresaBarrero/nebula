import { SeccionPendiente, metaSeccion } from '@/components/app/SeccionPendiente';

// Pendiente: esta sección se construye en su fase (ver SPEC §12).
export const metadata = metaSeccion('colaboradores');

export default function Page() {
  return <SeccionPendiente id="colaboradores" />;
}
