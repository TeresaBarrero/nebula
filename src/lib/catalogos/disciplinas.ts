// Disciplinas (SPEC §5, constante DISC del prototipo). `cls` es el color pastel por significado.
export const DISCIPLINAS = {
  branding: { label: 'Branding', cls: 'peach' },
  grafico: { label: 'Diseño gráfico', cls: 'butter' },
  web: { label: 'Diseño web', cls: 'lilac' },
  desarrollo: { label: 'Desarrollo', cls: 'sage' },
  social: { label: 'Redes sociales', cls: 'rose' },
  seo: { label: 'SEO y anuncios', cls: 'sand' },
  copy: { label: 'Textos y copy', cls: 'butter' },
  foto: { label: 'Foto y vídeo', cls: 'mist' },
  cint: { label: 'Comunicación interna', cls: 'lilac' },
  cext: { label: 'Prensa y comunicación externa', cls: 'peach' },
} as const;

export type Disciplina = keyof typeof DISCIPLINAS;

export const CLAVES_DISCIPLINA = Object.keys(DISCIPLINAS) as Disciplina[];

export function esDisciplina(v: unknown): v is Disciplina {
  return typeof v === 'string' && v in DISCIPLINAS;
}
