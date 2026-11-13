/** Saludo según la hora, como en el prototipo: antes de las 13 h, antes de las 21 h y noche. */
export function saludo(hora: number): string {
  if (hora < 13) return 'Buenos días';
  if (hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Iniciales para el avatar («María Teresa» → «MT»). */
export function iniciales(nombre: string | null | undefined): string {
  const r = String(nombre || '')
    .replace(/[&,.·]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return r || '?';
}

/** Minúsculas y sin tildes, para buscar («Facturación» encuentra «facturacion»). */
export function normalizar(s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Fecha larga en español: «jueves, 13 de noviembre». */
export function fechaLarga(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}
