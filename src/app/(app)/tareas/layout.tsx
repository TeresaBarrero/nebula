import { metaSeccion } from '@/components/app/SeccionPendiente';

// Título de la pestaña del navegador (la página es interactiva y no puede ponerlo ella).
export const metadata = metaSeccion('tareas');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
