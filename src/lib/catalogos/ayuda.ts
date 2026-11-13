// Textos exactos de las ayudas «?» (SPEC §9.3, constante HELP del prototipo).
export const AYUDA = {
  base: 'Sin IVA: lo que cobras por tu trabajo, antes de impuestos.',
  iva: 'IVA: impuesto que cobras al cliente y luego pagas a Hacienda cada trimestre. Ese dinero no es tuyo.',
  irpf: 'Retención de IRPF: el cliente se queda este porcentaje y lo paga a Hacienda por ti, como adelanto de tu renta. Solo se aplica si facturas a empresas o autónomos.',
  rect: 'Factura rectificativa: una factura enviada no se puede borrar ni cambiar. Si tiene un error, se hace otra que la anula o la corrige.',
  borrador: 'Borrador: todavía puedes cambiarla. Al emitirla recibe su número y ya no se puede modificar.',
  numero: 'Las facturas van numeradas seguidas y sin saltos (001, 002, 003…). nebúla lo hace por ti al emitirlas.',
  ingresaran: 'Lo que el cliente te pagará: tu trabajo + IVA − retención.',
  prevision: 'Suma de cada oportunidad multiplicada por su probabilidad. Ejemplo: 1.000 € con un 50 % de probabilidad cuentan como 500 €.',
  iguala: 'Iguala: cliente que te paga una cuota fija cada mes por un servicio continuo (redes, mantenimiento web, newsletter…).',
  rondas: 'Rondas de cambios: las veces que el cliente pide cambios en un entregable. Si pasa de las incluidas en el presupuesto, puedes cobrarlas aparte.',
  eurh: 'Precio por hora real: lo que has facturado dividido entre las horas que has trabajado de verdad.',
  margen: 'Margen: lo que te queda después de restar los gastos (colaboradores, imprenta, publicidad…).',
  iva303: 'IVA a pagar: el IVA que has cobrado en tus facturas menos el que has pagado en tus gastos. Es lo que se declara en el modelo 303.',
  rgpd: 'Protección de datos (RGPD): necesitas el permiso de cada persona para guardar sus datos y enviarle comunicaciones.',
  renov: 'Renovaciones: dominios, hosting o licencias que pagas por tus clientes cada año. nebúla te avisa antes de que caduquen para que las renueves y las cobres.',
  deducible: 'Gasto deducible: gasto necesario para tu actividad. Reduce lo que pagas de impuestos.',
  rendimiento: 'Lo que has ganado: tus ingresos sin IVA menos tus gastos deducibles.',
} as const;

export type ClaveAyuda = keyof typeof AYUDA;
