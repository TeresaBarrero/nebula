// Catálogos de la Fase 2, copiados del prototipo (IST, RN, XCAT y métodos de pago).
import type { MetodoPago, TipoRenovacion } from '@/lib/datos/entidades';
import type { Pastel } from './crm';

export type EstadoFactura = 'borrador' | 'pendiente' | 'parcial' | 'pagada' | 'vencida' | 'rectificativa' | 'enviado' | 'aceptado' | 'rechazado';

/** Estados de facturas y presupuestos con su texto llano (IST del prototipo). */
export const ESTADOS_FACTURA: Record<EstadoFactura, { label: string; cls: Pastel }> = {
  borrador: { label: 'Borrador', cls: 'mist' },
  pendiente: { label: 'Esperando el pago', cls: 'butter' },
  parcial: { label: 'Pagada en parte', cls: 'sand' },
  pagada: { label: 'Pagada', cls: 'sage' },
  vencida: { label: 'Fuera de plazo', cls: 'rose' },
  rectificativa: { label: 'Rectificativa', cls: 'lilac' },
  enviado: { label: 'Enviado', cls: 'lilac' },
  aceptado: { label: 'Aceptado', cls: 'sage' },
  rechazado: { label: 'Rechazado', cls: 'rose' },
};

export const METODOS_PAGO: MetodoPago[] = ['Transferencia', 'Bizum', 'Tarjeta', 'Efectivo', 'Domiciliación'];

export const CATEGORIAS_GASTO = [
  'Colaboradores',
  'Software y suscripciones',
  'Cuota de autónomos',
  'Oficina',
  'Imprenta y material',
  'Publicidad',
  'Formación',
  'Transporte',
  'Gestoría y bancos',
  'Renovaciones de clientes',
  'Otros',
] as const;

export const TIPOS_IVA = [21, 10, 4, 0] as const;
export const TIPOS_IRPF = [15, 7, 0] as const;

export const TIPOS_RENOVACION: Record<TipoRenovacion, { label: string; cls: Pastel }> = {
  dominio: { label: 'Dominio', cls: 'lilac' },
  hosting: { label: 'Hosting', cls: 'sage' },
  ssl: { label: 'Certificado SSL', cls: 'mist' },
  licencia: { label: 'Licencia', cls: 'butter' },
  email: { label: 'Correo profesional', cls: 'peach' },
};
