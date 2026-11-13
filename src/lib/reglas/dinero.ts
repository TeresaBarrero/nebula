/** Redondeo a 2 decimales (SPEC §7.1: «redondeo a 2 decimales en cada paso»). */
export function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const fmtEur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtEur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

/** Euros sin decimales, como en las cifras del prototipo («1.060 €»). */
export function eur(n: number | null | undefined): string {
  return fmtEur0.format(n || 0);
}

/** Euros con dos decimales («1.060,00 €»). */
export function eur2(n: number | null | undefined): string {
  return fmtEur2.format(n || 0);
}

export type EjemploFactura = { base: number; iva: number; irpf: number; total: number };

/**
 * Lo que te ingresarán por un trabajo (SPEC §7.1):
 * total = base + iva − irpf, redondeando cada paso.
 */
export function ejemploFactura(base: number, ivaPct: number, irpfPct: number): EjemploFactura {
  const b = r2(base);
  const iva = r2((b * ivaPct) / 100);
  const irpf = r2((b * irpfPct) / 100);
  return { base: b, iva, irpf, total: r2(b + iva - irpf) };
}
