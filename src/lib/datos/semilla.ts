/**
 * Datos ficticios de la demo: los del prototipo (funciones seed() y ext()).
 * Las fechas se calculan desde el día de la visita, para que la demo siempre parezca de esta semana.
 * Cada fase añade aquí los datos de sus pantallas (SPEC §14.2).
 */
import type { Disciplina } from '@/lib/catalogos/disciplinas';
import { r2 } from '@/lib/reglas/dinero';
import { sumarDias } from '@/lib/reglas/fechas';
import { nombreMes } from '@/lib/reglas/recurrentes';
import type {
  Apunte,
  Colecciones,
  Contacto,
  Documento,
  Empresa,
  Entregable,
  Factura,
  Gasto,
  Iguala,
  LineaFactura,
  Nota,
  Oportunidad,
  Pago,
  Proyecto,
  Renovacion,
  Reunion,
  Tarea,
  ViaPermiso,
} from './entidades';

export function semillaDemo(hoy: string): Colecciones {
  const D = (n: number) => sumarDias(hoy, n);
  const creado = (n = -30) => `${D(n)}T09:00:00.000Z`;

  const emp = (id: string, name: string, nif: string, sector: string, address: string, email: string, phone: string, web: string, notes = ''): Empresa => ({
    id, name, nif, sector, address, email, phone, web, notes, isPrivate: false, createdAt: creado(-200),
  });
  const companies: Empresa[] = [
    emp('co1', 'Estudio Alba S.L.', 'B12345678', 'Arquitectura', 'C/ Mayor 12, 28013 Madrid', 'admin@estudioalba.es', '910 000 111', 'estudioalba.es'),
    emp('co2', 'Ruiz & Asociados Abogados S.L.P.', 'B87654321', 'Legal', 'Av. Diagonal 340, 08013 Barcelona', 'facturas@ruizasociados.es', '930 000 222', 'ruizasociados.es', 'Las facturas van a Administración.'),
    emp('co3', 'Panadería La Espiga', '44556677K', 'Alimentación', 'Pl. del Mercado 3, 46001 Valencia', 'hola@laespiga.es', '960 000 333', '', 'Titular autónoma.'),
    emp('co4', 'Imprenta Ortega S.L.', 'B33445566', 'Artes gráficas', 'Pol. Ind. Sur, nave 8, Valencia', 'pedidos@imprentaortega.es', '961 448 120', 'imprentaortega.es', 'También es proveedor de impresión.'),
    emp('co5', 'Clínica Dental Sanz S.L.', 'B99887766', 'Salud', 'C/ Colón 45, 41001 Sevilla', 'gestion@clinicasanz.es', '950 000 444', 'clinicasanz.es'),
    emp('co6', 'Hotel Mirador S.A.', 'A55443322', 'Hostelería', 'Paseo Marítimo 8, 29016 Málaga', 'direccion@hotelmirador.es', '952 330 210', 'hotelmirador.es'),
    emp('co7', 'Gimnasio Pulso S.L.', 'B22113344', 'Deporte', 'C/ Alcalá 210, 28028 Madrid', 'info@pulsogym.es', '910 000 555', 'pulsogym.es'),
    emp('co8', 'Bodegas Ferrer S.L.', 'B66778899', 'Vinos', 'Ctra. de Valdepeñas km 4, Ciudad Real', 'info@bodegasferrer.es', '926 000 666', 'bodegasferrer.es'),
    emp('co9', 'Café Nómada', 'B44332211', 'Hostelería', 'C/ Fuencarral 88, 28004 Madrid', 'hola@cafenomada.es', '910 000 777', ''),
  ];

  type DatosContacto = Partial<Contacto> & Pick<Contacto, 'id' | 'name'>;
  const con = (o: DatosContacto, permiso?: [number, ViaPermiso]): Contacto => ({
    companyId: null, role: '', nif: '', email: '', phone: '', type: 'Cliente', status: 'activo', tags: [], notes: '',
    specialty: null, rate: null, availability: null,
    consent: Boolean(permiso), consentDate: permiso ? D(permiso[0]) : null, consentVia: permiso ? permiso[1] : null,
    createdAt: creado(-150), ...o,
  });
  const t = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const contacts: Contacto[] = [
    con({ id: 'c1', name: 'Lucía Fernández', companyId: 'co1', role: 'Dirección', email: 'lucia@estudioalba.es', phone: '612 345 678', tags: t('arquitectura, web'), notes: 'Prefiere reuniones por la mañana.' }, [-120, 'Contrato']),
    con({ id: 'c12', name: 'Tomás Prieto', companyId: 'co1', role: 'Arquitectura', email: 'tomas@estudioalba.es', phone: '612 000 012', notes: 'Revisa los contenidos técnicos.' }, [-120, 'Contrato']),
    con({ id: 'c2', name: 'Marcos Ruiz', companyId: 'co2', role: 'Dirección', email: 'mruiz@ruizasociados.es', phone: '634 112 908', tags: t('legal'), notes: 'Todo por correo.' }, [-60, 'Contrato']),
    con({ id: 'c11', name: 'Irene Soler', companyId: 'co2', role: 'Administración y personas', email: 'isoler@ruizasociados.es', phone: '634 000 112', tags: t('comunicación interna, pagos'), notes: 'Aprueba la newsletter y paga las facturas.' }, [-60, 'Contrato']),
    con({ id: 'c3', name: 'Carmen Vidal', companyId: 'co3', role: 'Titular', nif: '44556677K', email: 'hola@laespiga.es', phone: '655 221 004', tags: t('branding, retail'), notes: 'Vino recomendada por Lucía.' }, [-20, 'Email']),
    con({ id: 'c4', name: 'Javier Ortega', companyId: 'co4', role: 'Gerencia', email: 'pedidos@imprentaortega.es', phone: '961 448 120', type: 'Proveedor', tags: t('imprenta'), notes: 'Plazo habitual: 5 días laborables.' }, [-300, 'Contrato']),
    con({ id: 'c5', name: 'Elena Sanz', companyId: 'co5', role: 'Marketing', email: 'elena@clinicasanz.es', phone: '677 908 331', tags: t('salud, redes sociales'), notes: 'Aprueba el contenido los lunes.' }, [-90, 'Contrato']),
    con({ id: 'c7', name: 'Sofía Navarro', companyId: 'co6', role: 'Dirección', email: 'direccion@hotelmirador.es', phone: '952 330 210', tags: t('hostelería') }, [-180, 'Contrato']),
    con({ id: 'c8', name: 'Andrés Gil', companyId: 'co7', role: 'Gerencia', email: 'andres@pulsogym.es', phone: '699 554 021', status: 'potencial', tags: t('deporte, app'), notes: 'Decide antes de fin de año.' }, [-25, 'Formulario web']),
    con({ id: 'c9', name: 'Nuria Ferrer', companyId: 'co8', role: 'Marketing', email: 'nuria@bodegasferrer.es', phone: '626 000 909', status: 'potencial', tags: t('vinos, packaging') }),
    con({ id: 'c10', name: 'Diego Ramos', companyId: 'co9', role: 'Gerencia', email: 'diego@cafenomada.es', phone: '611 000 010', status: 'potencial', tags: t('hostelería'), notes: 'Le conocí en una feria.' }),
    con({ id: 'c6', name: 'Pablo Medina', role: 'Desarrollo web', nif: '12312312Z', email: 'pablo@medina.dev', phone: '688 765 432', type: 'Colaborador', tags: t('wordpress, react'), notes: 'Prefiere encargos con 2 semanas de margen.', specialty: 'desarrollo', rate: 40, availability: 'parcial' }, [-200, 'Contrato']),
    con({ id: 'c13', name: 'Ainhoa Ruiz', role: 'Fotografía de producto', email: 'hola@ainhoaruiz.photo', phone: '633 000 013', type: 'Colaborador', tags: t('producto, retrato'), notes: 'Tiene estudio propio en Valencia.', specialty: 'foto', rate: 60, availability: 'disponible' }, [-150, 'Contrato']),
    con({ id: 'c14', name: 'Jordi Puig', role: 'Redacción y copy', email: 'jordi@puigcopy.com', phone: '644 000 014', type: 'Colaborador', tags: t('textos, newsletter'), notes: 'Castellano y catalán.', specialty: 'copy', rate: 35, availability: 'disponible' }, [-150, 'Contrato']),
    con({ id: 'c15', name: 'Leo Martín', role: 'Vídeo y motion', email: 'leo@martinmotion.es', phone: '655 000 015', type: 'Colaborador', tags: t('reels, animación'), notes: 'Ocupado hasta enero.', specialty: 'foto', rate: 45, availability: 'ocupado' }, [-90, 'Contrato']),
  ];

  const op = (o: Partial<Oportunidad> & Pick<Oportunidad, 'id' | 'title' | 'stage' | 'value' | 'prob'>, creadoHace: number): Oportunidad => ({
    discipline: null, companyId: null, contactId: null, expected: null, source: '', notes: '', lostReason: '', projectId: null, closedAt: null,
    createdAt: creado(creadoHace), ...o,
  });
  const deals: Oportunidad[] = [
    op({ id: 'd1', title: 'Web con reservas para Café Nómada', discipline: 'web', companyId: 'co9', contactId: 'c10', value: 3200, prob: 20, stage: 'contactado', expected: D(30), source: 'Evento o feria', notes: 'Quiere abrir reservas antes de primavera.' }, -8),
    op({ id: 'd2', title: 'Etiquetas de edición limitada', discipline: 'grafico', companyId: 'co8', contactId: 'c9', value: 2400, prob: 40, stage: 'propuesta', expected: D(20), source: 'Recomendación' }, -15),
    op({ id: 'd3', title: 'Lanzamiento app Pulso', discipline: 'branding', companyId: 'co7', contactId: 'c8', value: 5400, prob: 70, stage: 'negociacion', expected: D(15), source: 'Web', notes: 'Presupuesto P-2026-012 enviado.', projectId: 'p6' }, -40),
    op({ id: 'd4', title: 'Packaging navideño', discipline: 'grafico', companyId: 'co3', contactId: 'c3', value: 1200, prob: 40, stage: 'propuesta', expected: D(10), source: 'Cliente actual' }, -3),
    op({ id: 'd5', title: 'Campaña de anuncios para la web nueva', discipline: 'seo', companyId: 'co1', contactId: 'c1', value: 1800, prob: 70, stage: 'negociacion', expected: D(7), source: 'Cliente actual', notes: 'Al lanzar la web.' }, -10),
    op({ id: 'd6', title: 'Portal de clientes', discipline: 'desarrollo', companyId: 'co2', contactId: 'c2', value: 6500, prob: 100, stage: 'ganado', expected: D(-30), source: 'Recomendación', projectId: 'p5', closedAt: D(-30) }, -70),
    op({ id: 'd7', title: 'Rediseño de la carta del restaurante', discipline: 'grafico', companyId: 'co6', contactId: 'c7', value: 900, prob: 0, stage: 'perdido', expected: D(-55), source: 'Cliente actual', lostReason: 'Precio', closedAt: D(-55) }, -75),
    op({ id: 'd8', title: 'Identidad Clínica Veterinaria Huellas', discipline: 'branding', value: 2000, prob: 10, stage: 'nuevo', expected: D(45), source: 'Formulario web', notes: 'Han escrito por el formulario. Pendiente de llamar.' }, -1),
    op({ id: 'd9', title: 'Campaña 2027 Clínica Sanz', discipline: 'social', companyId: 'co5', contactId: 'c5', value: 7200, prob: 20, stage: 'contactado', expected: D(45), source: 'Cliente actual' }, -6),
    op({ id: 'd10', title: 'Identidad de marca La Espiga', discipline: 'branding', companyId: 'co3', contactId: 'c3', value: 1900, prob: 100, stage: 'ganado', expected: D(-12), source: 'Recomendación', projectId: 'p2', closedAt: D(-12) }, -30),
    op({ id: 'd11', title: 'Nota de prensa de apertura', discipline: 'cext', companyId: 'co9', contactId: 'c10', value: 900, prob: 10, stage: 'nuevo', expected: D(-3), source: 'Contacto directo' }, -25),
  ];

  const pr = (o: Partial<Proyecto> & Pick<Proyecto, 'id' | 'name' | 'status'>, d: Disciplina): Proyecto => ({
    contactId: null, discipline: d, start: null, end: null, prevStatus: null, priority: 'media', budget: 0, hoursBudget: 0, roundsIncluded: 2,
    description: '', tags: [], collaborators: [], createdAt: creado(-60), ...o,
  });
  const projects: Proyecto[] = [
    pr({ id: 'p1', name: 'Web corporativa Estudio Alba', contactId: 'c1', start: D(-30), end: D(25), status: 'produccion', priority: 'alta', budget: 4800, hoursBudget: 60, collaborators: ['c6'], description: 'Nueva web con portfolio y reservas de visitas.', tags: ['wordpress'] }, 'web'),
    pr({ id: 'p2', name: 'Identidad de marca La Espiga', contactId: 'c3', start: D(-10), end: D(40), status: 'concepto', budget: 1900, hoursBudget: 30, roundsIncluded: 3, collaborators: ['c13'], description: 'Logotipo, colores y aplicaciones en packaging.', tags: ['packaging'] }, 'branding'),
    pr({ id: 'p3', name: 'Campaña de captación Clínica Sanz', contactId: 'c5', start: D(-25), end: D(18), status: 'revisiones', priority: 'urgente', budget: 2600, hoursBudget: 25, description: 'Anuncios en Meta y Google para conseguir pacientes de ortodoncia.', tags: ['anuncios'] }, 'seo'),
    pr({ id: 'p4', name: 'Catálogo Hotel Mirador', contactId: 'c7', start: D(-160), end: D(-50), status: 'entregado', priority: 'baja', budget: 3200, hoursBudget: 70, collaborators: ['c13'], description: 'Catálogo de 48 páginas con fotografía propia.', tags: ['editorial'] }, 'grafico'),
    pr({ id: 'p5', name: 'Portal de clientes Ruiz & Asociados', contactId: 'c2', start: D(-20), end: D(70), status: 'pausa', prevStatus: 'investigacion', budget: 6500, hoursBudget: 80, collaborators: ['c6'], description: 'Área privada para que los clientes consulten sus expedientes. En pausa hasta la firma del socio.' }, 'desarrollo'),
    pr({ id: 'p6', name: 'Lanzamiento app Pulso', contactId: 'c8', start: D(5), end: D(95), status: 'briefing', priority: 'alta', budget: 5400, hoursBudget: 50, collaborators: ['c14'], description: 'Marca y página de lanzamiento de la app de reservas.', tags: ['app'] }, 'branding'),
    pr({ id: 'p7', name: 'Comunicación interna · temporada 2027', contactId: 'c7', start: D(-12), end: D(30), status: 'concepto', budget: 1600, hoursBudget: 20, collaborators: ['c14'], description: 'Campaña para el equipo del hotel antes de la temporada.' }, 'cint'),
    pr({ id: 'p8', name: 'Identidad visual Imprenta Ortega', contactId: 'c4', start: D(-260), end: D(-200), status: 'entregado', budget: 2100, hoursBudget: 35, roundsIncluded: 3, description: 'Renovación de logotipo y papelería.' }, 'branding'),
  ];

  const en = (id: string, projectId: string, name: string, status: Entregable['status'], sentAt: number | null = null, approvedAt: number | null = null): Entregable => ({
    id, projectId, name, status, sentAt: sentAt === null ? null : D(sentAt), approvedAt: approvedAt === null ? null : D(approvedAt), billedExtra: 0, createdAt: creado(-40),
  });
  const deliverables: Entregable[] = [
    en('v1', 'p1', 'Wireframes', 'aprobado', -15, -14),
    en('v2', 'p1', 'Diseño UI · home e interiores', 'enviado', -6),
    en('v3', 'p1', 'Web en pruebas', 'en_curso'),
    en('v4', 'p2', 'Moodboard', 'aprobado', -8, -7),
    en('v5', 'p2', 'Propuestas de logotipo', 'enviado', -1),
    en('v6', 'p3', 'Creatividades de la campaña', 'enviado', -2),
    en('v7', 'p3', 'Informe de resultados', 'en_curso'),
    en('v8', 'p4', 'Arte final del catálogo', 'aprobado', -60, -58),
    en('v9', 'p7', 'Concepto de campaña interna', 'enviado', -2),
    en('v10', 'p6', 'Moodboard', 'en_curso'),
  ];

  const ta = (id: string, title: string, due: number | null, urgent: boolean, important: boolean, done: boolean, projectId: string | null, contactId: string | null, extra: Partial<Tarea> = {}): Tarea => ({
    id, title, due: due === null ? null : D(due), urgent, important, done, projectId, contactId,
    assigneeId: null, estimate: 2, repeat: '', blockedBy: null, nextCreated: false, phase: null, createdAt: creado(-20), ...extra,
  });
  const tasks: Tarea[] = [
    ta('t1', 'Enviar diseño de interiores a Lucía', 0, true, true, false, 'p1', 'c1', { estimate: 3 }),
    ta('t2', 'Revisar contrato de mantenimiento', -1, true, true, false, 'p5', 'c2'),
    ta('t3', 'Aplicar los cambios de las creatividades', 1, true, true, false, 'p3', 'c5', { estimate: 4 }),
    ta('t4', 'Versión final del logotipo en marrón cálido', 3, false, true, false, 'p2', 'c3', { estimate: 5 }),
    ta('t5', 'Preparar preguntas del briefing de Pulso', 2, false, true, false, 'p6', 'c8', { estimate: 2 }),
    ta('t6', 'Pedir presupuesto de papel a Imprenta Ortega', 2, true, false, false, null, 'c4'),
    ta('t7', 'Confirmar sesión de fotos con Ainhoa', 0, true, false, false, 'p2', 'c13'),
    ta('t8', 'Subir el catálogo del hotel al portfolio', 14, false, false, false, 'p4', null),
    ta('t9', 'Pasar los tickets de octubre a Gastos', 6, false, false, false, null, null, { repeat: 'mensual' }),
    ta('t10', 'Maquetar página de proyectos', 4, false, true, false, 'p1', 'c1', { blockedBy: 't1', estimate: 6 }),
    ta('t11', 'Encargar textos de la newsletter de diciembre a Jordi', 5, false, true, false, null, 'c14', { assigneeId: 'c14', estimate: 1 }),
    ta('t12', 'Informe de métricas de octubre', -3, true, true, true, 'p3', 'c5'),
    ta('t13', 'Reunión técnica con Pablo', -5, false, true, true, 'p1', 'c6'),
    ta('t14', 'Entregar archivos finales del catálogo', -52, true, true, true, 'p4', 'c7'),
    ta('t15', 'Moodboard de la identidad', -8, false, true, true, 'p2', 'c3'),
    ta('t16', 'Investigar la competencia de Pulso', 7, false, true, false, 'p6', 'c8', { estimate: 6 }),
    ta('t17', 'Llamar a Clínica Veterinaria Huellas', 0, true, false, false, null, null),
    ta('t18', 'Actualizar tarifas en la web propia', 20, false, false, false, null, null),
    ta('t19', 'Wireframes de la home', -15, false, true, true, 'p1', 'c1'),
    ta('t20', 'Concepto de la campaña interna', -2, true, true, true, 'p7', 'c7'),
    ta('t21', 'Piezas de la campaña interna', 8, false, true, false, 'p7', 'c7', { estimate: 8 }),
    ta('t22', 'Informe semanal de redes · Clínica Sanz', 4, false, true, false, null, 'c5', { repeat: 'semanal', estimate: 1 }),
    ta('t23', 'Sesión de fotos de producto', 12, false, true, false, 'p2', 'c3', { assigneeId: 'c13', estimate: 6 }),
    ta('t24', 'Desarrollar la página de proyectos', 9, false, true, false, 'p1', 'c1', { assigneeId: 'c6', estimate: 16, blockedBy: 't10' }),
    ta('t25', 'Textos de la newsletter de diciembre', 15, false, true, false, null, 'c11', { assigneeId: 'c14', estimate: 4 }),
    ta('t26', 'Diseño de la marca de Pulso', 16, false, true, false, 'p6', 'c8', { estimate: 20 }),
    ta('t27', 'Piezas de la campaña de diciembre', 8, false, true, false, 'p3', 'c5', { estimate: 12 }),
    ta('t28', 'Revisar el portal con Pablo', 20, false, true, false, 'p5', 'c6', { assigneeId: 'c6', estimate: 8 }),
  ];

  const ev = (id: string, title: string, d: number, time: string, contactId: string | null, projectId: string | null): Reunion => ({
    id, title, date: D(d), time, contactId, projectId, source: null, createdAt: creado(-10),
  });
  const events: Reunion[] = [
    ev('e1', 'Seguimiento con Estudio Alba', 0, '10:00', 'c1', 'p1'),
    ev('e2', 'Revisión de anuncios con Clínica Sanz', 0, '16:30', 'c5', 'p3'),
    ev('e3', 'Presentación del logotipo final', 5, '11:00', 'c3', 'p2'),
    ev('e4', 'Reunión de briefing con Pulso', 2, '09:30', 'c8', 'p6'),
    ev('e5', 'Comida con Pablo', 1, '14:00', 'c6', null),
    ev('e6', 'Reunión con la gestoría (cierre del trimestre)', 8, '12:00', null, null),
    ev('e7', 'Firma de contrato del portal', 13, '17:00', 'c2', 'p5'),
    ev('e8', 'Sesión de fotos de producto', 12, '10:00', 'c13', 'p2'),
    ev('e9', 'Formación: herramientas de IA', -4, '18:00', null, null),
  ];

  const no = (id: string, text: string, color: Nota['color'], pinned: boolean, contactId: string | null, projectId: string | null, d: number): Nota => ({
    id, text, color, pinned, contactId, projectId, date: D(d), createdAt: creado(d),
  });
  const notes: Nota[] = [
    no('n1', 'Idea: ofrecer un pack de mantenimiento mensual a los clientes de web (150 €/mes).', 'butter', true, null, null, -3),
    no('n2', 'El logo nuevo tiene que funcionar en negativo y en una sola tinta.', 'peach', false, 'c1', 'p1', -6),
    no('n3', 'Llevar a la gestoría el resumen trimestral de Informes.', 'lilac', true, null, null, -1),
    no('n4', 'Pulso quiere reservas de clases + pagos dentro de la app.', 'sage', false, 'c8', 'p6', -18),
    no('n5', 'Lecturas pendientes:\n· Hábitos atómicos\n· Deep Work', 'sand', false, null, null, -9),
  ];

  const ap = (id: string, type: Apunte['type'], text: string, d: number, contactId: string | null, projectId: string | null): Apunte => ({
    id, type, text, date: D(d), contactId, projectId, createdAt: creado(d),
  });
  const activities: Apunte[] = [
    ap('a1', 'llamada', 'Revisamos los wireframes. Le encaja la estructura.', -1, 'c1', 'p1'),
    ap('a2', 'email', 'Enviado el diseño de la home.', -6, 'c1', 'p1'),
    ap('a3', 'reunion', 'Reunión de inicio. Prioridad: reservas online.', -28, 'c1', 'p1'),
    ap('a4', 'nota', 'Firma pendiente del socio. Volver a escribir la semana que viene.', -9, 'c2', 'p5'),
    ap('a5', 'llamada', 'Le gustan los tonos tierra. Elige la propuesta B.', -2, 'c3', 'p2'),
    ap('a6', 'email', 'Pedido el catálogo de papeles reciclados.', -12, 'c4', null),
    ap('a7', 'reunion', 'Métricas: +18 % de citas desde Instagram.', -7, 'c5', 'p3'),
    ap('a8', 'nota', 'Disponible desde el lunes, 25 h/semana.', -5, 'c6', null),
    ap('a9', 'llamada', 'Quieren repetir catálogo y hacer campaña interna.', -14, 'c7', 'p7'),
    ap('a10', 'email', 'Enviado el presupuesto del lanzamiento.', -18, 'c8', 'p6'),
    ap('a11', 'nota', 'Primer contacto por recomendación de Lucía.', -20, 'c3', null),
    ap('a12', 'reunion', 'Café en una feria de hostelería. Interés en web con reservas.', -8, 'c10', null),
    ap('a13', 'email', 'Enviada propuesta de etiquetas.', -15, 'c9', null),
    ap('a14', 'email', 'Recordatorio de pago de la factura F-2026-039.', -5, 'c2', null),
  ];

  // Documentos de ejemplo: solo la ficha (en la demo no hay archivo real detrás).
  const doc = (id: string, name: string, size: number, mime: string, d: number, contactId: string, companyId: string, projectId: string): Documento => ({
    id, name, size, mime, storagePath: '', contactId, companyId, projectId, date: D(d), createdAt: creado(d),
  });
  const files: Documento[] = [
    doc('fl1', 'Contrato_portal_Ruiz.pdf', 241000, 'application/pdf', -28, 'c2', 'co2', 'p5'),
    doc('fl2', 'Brief_Estudio_Alba.pdf', 512000, 'application/pdf', -29, 'c1', 'co1', 'p1'),
    doc('fl3', 'Moodboard_La_Espiga.png', 1830000, 'image/png', -8, 'c3', 'co3', 'p2'),
    doc('fl4', 'Creatividades_v4.zip', 4800000, 'application/zip', -2, 'c5', 'co5', 'p3'),
    doc('fl5', 'Catalogo_final_Mirador.pdf', 8400000, 'application/pdf', -50, 'c7', 'co6', 'p4'),
  ];

  // ───────── Fase 2 · Dinero ─────────
  const retainers: Iguala[] = [
    { id: 'r1', name: 'Redes sociales mensual', companyId: 'co5', contactId: 'c5', discipline: 'social', fee: 650, hours: 15, billingDay: 1, start: D(-200), services: '12 publicaciones al mes en Instagram y Facebook, stories semanales e informe mensual.', active: true, lastBilled: '', extraBilled: '', createdAt: creado(-200) },
    { id: 'r2', name: 'Mantenimiento web y SEO', companyId: 'co1', contactId: 'c1', discipline: 'web', fee: 150, hours: 3, billingDay: 10, start: D(-45), services: 'Actualizaciones, copias de seguridad, pequeños cambios y SEO básico.', active: true, lastBilled: '', extraBilled: '', createdAt: creado(-45) },
    { id: 'r3', name: 'Newsletter interna mensual', companyId: 'co2', contactId: 'c11', discipline: 'cint', fee: 400, hours: 8, billingDay: 1, start: D(-100), services: 'Newsletter para las 45 personas del despacho y cartelería de oficina.', active: true, lastBilled: '', extraBilled: '', createdAt: creado(-100) },
  ];
  const cuota: Record<string, [string, number]> = { r1: ['Redes sociales', 650], r2: ['Mantenimiento web y SEO', 150], r3: ['Newsletter interna', 400] };

  const L = (desc: string, qty: number, price: number): LineaFactura => ({ desc, qty, price });
  const doc0 = (o: Partial<Factura> & Pick<Factura, 'id' | 'kind' | 'series' | 'number' | 'status' | 'date'>): Factura => ({
    companyId: null, contactId: null, projectId: null, retainerId: null, dealId: null, fromQuoteId: null, rectifiesId: null,
    iva: 21, irpf: 15, due: sumarDias(o.date, 30), notes: '', lines: [], client: null, issuer: null, issuedAt: null, createdAt: `${o.date}T09:00:00.000Z`, ...o,
  });
  // Facturas emitidas: [empresa, contacto, proyecto, iguala, líneas, hace cuántos días, cuánto han pagado]
  type Emitida = [string, string, string | null, string | null, LineaFactura[] | null, number, 'todo' | number];
  const raw: Emitida[] = [
    ['co4', 'c4', 'p8', null, [L('Identidad visual · proyecto completo', 1, 2100)], -215, 'todo'],
    ['co6', 'c7', null, null, [L('Mantenimiento web · semestre', 1, 300)], -170, 'todo'],
    ['co6', 'c7', 'p4', null, [L('Catálogo de temporada · 50 % al empezar', 1, 1600)], -150, 'todo'],
    ['co1', 'c1', 'p1', null, [L('Web corporativa · anticipo del 25 %', 1, 1200)], -118, 'todo'],
    ['co6', 'c7', 'p4', null, [L('Catálogo de temporada · 50 % a la entrega', 1, 1600)], -95, 'todo'],
    ['co2', 'c11', null, 'r3', null, -72, 'todo'],
    ['co5', 'c5', null, 'r1', null, -62, 'todo'],
    ['co5', 'c5', 'p3', null, [L('Campaña de captación · anticipo', 1, 800)], -50, 'todo'],
    ['co1', 'c1', null, 'r2', null, -42, 'todo'],
    ['co2', 'c11', null, 'r3', null, -41, 'todo'],
    ['co2', 'c2', null, null, [L('Consultoría inicial de comunicación (horas)', 6, 150)], -40, 0],
    ['co5', 'c5', null, 'r1', null, -31, 'todo'],
    ['co1', 'c1', 'p1', null, [L('Diseño UX · fase 2', 1, 1800)], -14, 'todo'],
    ['co2', 'c11', null, 'r3', null, -11, 0],
    ['co3', 'c3', 'p2', null, [L('Identidad de marca · anticipo del 30 %', 1, 600)], -6, 'todo'],
    ['co5', 'c5', null, 'r1', null, -3, 500],
  ];
  const contador = new Map<string, number>();
  const invoices: Factura[] = [];
  const payments: Pago[] = [];
  raw.forEach(([co, ct, p, r, lineas, dia, pagado], k) => {
    const date = D(dia);
    const anio = date.slice(0, 4);
    const n = (contador.get(anio) ?? 30) + 1; // empieza en 31: hubo facturas antes de usar nebúla
    contador.set(anio, n);
    const lines = lineas ?? [L(`${cuota[r!][0]} · ${nombreMes(date)}`, 1, cuota[r!][1])];
    const emp = companies.find((e) => e.id === co)!;
    const id = 'f' + k;
    invoices.push(
      doc0({
        id, kind: 'factura', series: 'F', number: `F-${anio}-${String(n).padStart(3, '0')}`, status: 'emitida', date, companyId: co, contactId: ct, projectId: p, retainerId: r, lines,
        client: { name: emp.name, nif: emp.nif, address: emp.address }, issuedAt: `${date}T10:00:00.000Z`,
      }),
    );
    const total = r2(lines.reduce((a, l) => a + l.qty * l.price, 0) * 1.06);
    if (pagado) payments.push({ id: 'pg' + k, invoiceId: id, date: D(dia + (pagado === 'todo' ? 18 : 2)), amount: pagado === 'todo' ? total : pagado, method: 'Transferencia', createdAt: creado(dia) });
  });
  invoices.push(doc0({ id: 'fb', kind: 'factura', series: 'F', number: '', status: 'borrador', date: D(0), companyId: 'co1', contactId: 'c1', projectId: 'p1', lines: [L('Desarrollo web · fase 3', 1, 1500)] }));
  const anioP = D(0).slice(0, 4);
  const pz = (id: string, n: number, co: string, ct: string, p: string | null, lines: LineaFactura[], dia: number, status: Factura['status'], dealId: string) =>
    doc0({ id, kind: 'presupuesto', series: 'P', number: `P-${anioP}-0${n}`, status, date: D(dia), companyId: co, contactId: ct, projectId: p, lines, dealId });
  invoices.push(
    pz('q1', 10, 'co6', 'c7', null, [L('Rediseño de la carta del restaurante', 1, 900)], -60, 'rechazado', 'd7'),
    pz('q2', 11, 'co2', 'c2', 'p5', [L('Diseño UX/UI del portal', 1, 2500), L('Desarrollo (horas)', 50, 80)], -30, 'aceptado', 'd6'),
    pz('q3', 12, 'co7', 'c8', 'p6', [L('Identidad de la app', 1, 2200), L('Página de lanzamiento', 1, 2400), L('Kit para redes sociales', 1, 800)], -18, 'enviado', 'd3'),
    pz('q4', 13, 'co3', 'c3', null, [L('Packaging navideño · 3 diseños', 3, 400)], -2, 'borrador', 'd4'),
    pz('q5', 14, 'co8', 'c9', null, [L('Diseño de etiquetas · edición limitada', 1, 1800), L('Adaptaciones a 3 formatos', 3, 200)], -15, 'enviado', 'd2'),
  );
  for (const r of retainers) r.lastBilled = invoices.filter((f) => f.retainerId === r.id).map((f) => f.date).sort().at(-1)?.slice(0, 7) ?? '';

  const renovacion = (id: string, companyId: string, type: Renovacion['type'], name: string, provider: string, cost: number, price: number, dia: number): Renovacion => ({
    id, companyId, type, name, provider, cost, price, renewDate: D(dia), createdAt: creado(-300),
  });
  const renewals: Renovacion[] = [
    renovacion('n1', 'co1', 'dominio', 'estudioalba.es', 'DonDominio', 12, 25, 18),
    renovacion('n2', 'co1', 'hosting', 'Hosting WordPress', 'Raiola Networks', 90, 180, 40),
    renovacion('n3', 'co5', 'dominio', 'clinicasanz.es', 'DonDominio', 12, 25, 6),
    renovacion('n4', 'co5', 'licencia', 'Elementor Pro', 'Elementor', 59, 90, 75),
    renovacion('n5', 'co2', 'hosting', 'Servidor del portal', 'Hetzner', 240, 360, 150),
    renovacion('n6', 'co6', 'dominio', 'hotelmirador.es', 'DonDominio', 12, 25, -3),
    renovacion('n7', 'co6', 'email', 'Correo profesional (5 cuentas)', 'Google Workspace', 360, 450, 60),
  ];

  const gasto = (id: string, dia: number, supplier: string, concept: string, category: string, base: number, ivaPct: number, extra: Partial<Gasto> = {}): Gasto => ({
    id, date: D(dia), supplier, contactId: null, concept, category, base, ivaPct, deductible: true, projectId: null, receiptPath: '', receiptName: '', createdAt: creado(dia), ...extra,
  });
  const expenses: Gasto[] = [];
  for (let k = 0; k < 6; k++)
    expenses.push(
      gasto(`xa${k}`, -k * 30 - 2, 'Adobe', 'Creative Cloud · cuota mensual', 'Software y suscripciones', 60.49, 21, { receiptName: 'adobe.pdf' }),
      gasto(`xs${k}`, -k * 30 - 1, 'Seguridad Social', 'Cuota de autónomos', 'Cuota de autónomos', 294, 0),
      gasto(`xc${k}`, -k * 30 - 5, 'Coworking La Nave', 'Puesto fijo mensual', 'Oficina', 150, 21),
    );
  expenses.push(
    gasto('x1', -12, 'Pablo Medina', 'Desarrollo web · fase 2', 'Colaboradores', 1000, 21, { contactId: 'c6', projectId: 'p1', receiptName: 'Factura_PM_0112.pdf' }),
    gasto('x2', -100, 'Imprenta Ortega', 'Impresión de 300 catálogos', 'Imprenta y material', 950, 21, { contactId: 'c4', projectId: 'p4', receiptName: 'Ortega_F2291.pdf' }),
    gasto('x3', -20, 'Meta', 'Anuncios de la campaña de captación', 'Publicidad', 300, 21, { projectId: 'p3' }),
    gasto('x4', -45, 'Domestika', 'Curso de escritura para interfaces', 'Formación', 39.9, 21),
    gasto('x5', -9, 'Renfe', 'Tren Madrid–Valencia · visita La Espiga', 'Transporte', 58.2, 10, { projectId: 'p2', receiptName: 'billete_renfe.pdf' }),
    gasto('x6', -9, 'Ainhoa Ruiz', 'Sesión de fotos de producto', 'Colaboradores', 300, 21, { contactId: 'c13', projectId: 'p2', receiptName: 'AR_factura_031.pdf' }),
    gasto('x7', -7, 'Jordi Puig', 'Textos de la campaña interna', 'Colaboradores', 240, 21, { contactId: 'c14', projectId: 'p7' }),
  );

  return {
    companies, contacts, deals, projects, deliverables, tasks, events, notes, activities, files,
    retainers, renewals, invoices, payments, expenses, notificationReads: [],
  };
}
