export type FormaJuridica = 'autonomo' | 'sociedad';
export type ModoIrpf = 'empresas' | 'particulares' | 'mixto';

/** Retención del perfil según la antigüedad como autónomo/a (SPEC §4.1, §6.1). */
export function irpfDelPerfil(nuevoAutonomo: boolean): 7 | 15 {
  return nuevoAutonomo ? 7 : 15;
}

type DatosIrpf = { kind: FormaJuridica; irpfMode: ModoIrpf; irpf: number };

/**
 * Retención IRPF por defecto (SPEC §7.4):
 * 0 si eres sociedad, si facturas a particulares o si la empresa cliente es particular.
 * Si no, la retención del perfil (15 o 7).
 */
export function irpfPorDefecto(ajustes: DatosIrpf, empresa?: { is_private?: boolean } | null): number {
  if (ajustes.kind === 'sociedad') return 0;
  if (ajustes.irpfMode === 'particulares') return 0;
  if (empresa?.is_private) return 0;
  return Number(ajustes.irpf) || 0;
}

/** Retención que muestra el asistente a partir de sus respuestas. */
export function irpfDelAsistente(d: { kind: FormaJuridica; irpfMode: ModoIrpf; newAutonomo: boolean }): number {
  return irpfPorDefecto({ kind: d.kind, irpfMode: d.irpfMode, irpf: irpfDelPerfil(d.newAutonomo) });
}
