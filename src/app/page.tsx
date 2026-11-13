import { redirect } from 'next/navigation';

// El proxy ya decide a dónde ir desde «/»; esto es solo por si acaso.
export default function Raiz() {
  redirect('/entrar');
}
