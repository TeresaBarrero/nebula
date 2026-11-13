# nebúla — Especificación funcional y técnica

> Documento de traspaso para desarrollar la aplicación real a partir del prototipo
> `prototipo/nebula-prototipo.html`. **El prototipo es la referencia visual y de comportamiento**:
> si algo de este documento no está claro, ábrelo en el navegador y míralo funcionando.

---

## 1. Visión del producto

**nebúla** es un CRM para **profesionales creativos 360º** (autónomos y pequeñas agencias):
branding, diseño gráfico, diseño web, desarrollo, redes sociales, SEO y anuncios,
copywriting, foto y vídeo, comunicación interna y comunicación externa / prensa.

Une en una sola herramienta lo que hoy se reparte entre un CRM (HubSpot, Pipedrive),
una herramienta de freelance (Bonsai, HoneyBook), una de agencias (Productive) y una de
facturación española (Holded, Quipu).

### Principios de diseño (obligatorios)
1. **Lenguaje llano.** Nada de jerga contable ni técnica en la interfaz: «Te deben»,
   «Te ingresarán», «Me ha pagado», «Fuera de plazo», «Lo que has ganado».
   Los términos técnicos (IVA, IRPF, rectificativa…) siempre llevan una **ayuda «?»**
   con una explicación de una línea (ver §9.3).
2. **Modo sencillo por defecto.** Las opciones avanzadas quedan detrás de «Más opciones».
3. **Estética pastel, limpia y organizada** (ver §8). Modo claro y oscuro.
4. **Todo enlazado.** Contacto ↔ empresa ↔ oportunidad ↔ proyecto ↔ tareas ↔ horas ↔
   entregables ↔ facturas ↔ gastos ↔ contrato ↔ documentos ↔ historial.
5. **Interfaz en español de España.** Fechas `es-ES`, moneda EUR, semana empieza en lunes.

### Usuario
Fase 1: **una persona** (autónomo/a o responsable de un pequeño estudio) con colaboradores
externos que **no** acceden a la app. Sus **clientes** acceden solo a su **portal** (§6.17).
Más adelante: multiusuario con permisos (fuera de alcance de esta versión, pero el modelo
de datos debe tener `workspace_id` desde el principio para no rehacerlo).

---

## 2. Tecnología recomendada

| Pieza | Propuesta | Motivo |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Web y PWA en un solo proyecto; rutas de servidor para webhooks |
| Estilos | **Tailwind CSS** usando los tokens de §8 como variables CSS | Respeta el diseño del prototipo y el modo oscuro |
| Componentes | Propios (o shadcn/ui re-estilizado con los tokens) | Mantener la identidad pastel |
| Base de datos y auth | **Supabase** (Postgres + Auth + Storage + Row Level Security) | Auth con email/Google, ficheros, RLS por `workspace_id` |
| ORM | Drizzle o el cliente de Supabase | Tipado de extremo a extremo |
| Pagos online | **Stripe** (tarjeta). Bizum: a valorar con una pasarela española (p. ej. Redsys) | Ver §10 |
| Correo saliente | Resend (o similar) | Recordatorios, portal, informes |
| PDF | Generación en servidor (react-pdf o similar) | Facturas, presupuestos, contratos, informes |
| Tareas programadas | Vercel Cron / Supabase scheduled functions | Recordatorios, igualas, renovaciones |
| Código | **GitHub** (repositorio privado, rama `main`) | Historial de versiones y copia de seguridad del código |
| Publicación | **Vercel conectado a GitHub** (cada cambio en `main` se publica solo; cada rama tiene su vista previa) | Sin servidores que mantener |
| Datos | **Supabase en región UE** | Datos en la UE por RGPD |
| Formato | **Web instalable (PWA)**: funciona en el navegador y se instala en el móvil desde el primer día. Sin apps nativas en esta versión | Una sola base de código |

Decisión confirmada con la persona responsable: TypeScript + Next.js, código en GitHub, web instalable. Si en el futuro se cambia algo, mantener: Postgres, RLS por espacio de trabajo, almacenamiento en la UE.

---

## 3. Navegación

Barra lateral verde salvia, **plegable** (flecha en la parte superior junto al logo; plegada
muestra solo iconos, la selección es un **cuadrado centrado en el icono**, separadores finos
entre grupos y un **punto melocotón** en los iconos con pendientes). En móvil es un cajón
que se abre con ☰.

```
Inicio
Oportunidades
Contactos
Empresas
── Trabajo
Proyectos
Tareas
Horas y carga
Contenidos
Calendario
── Dinero
Igualas y renovaciones
Contratos
Facturas
Gastos
Informes
── Red
Colaboradores
Portfolio
Notas
Automatizaciones
(pie) Perfil
```

Barra superior: buscador **⌘K / Ctrl+K**, **cronómetro** siempre visible, tema claro/oscuro,
campana de **avisos**. Botón flotante **«+»** para crear cualquier cosa.

Atajos: `⌘K` buscar o crear · `N` nueva tarea · `/` buscar · `Esc` cerrar.

---

## 4. Modelo de datos

Todas las tablas llevan `id uuid`, `workspace_id`, `created_at`, `updated_at`.
Fechas como `date` salvo donde se indique `timestamptz`. Importes en `numeric(12,2)`.

### 4.1 Perfil y ajustes (`profiles` / `workspace_settings`)
- `name` (cómo saludar), `full_name`, `role`, `email`, `phone`, `business` (estudio o marca)
- Fiscal: `legal_name`, `nif`, `address`, `iban`
- `kind`: `autonomo` | `sociedad`; `new_autonomo` (bool, <3 años → IRPF 7 %)
- `irpf_mode`: `empresas` | `particulares` | `mixto`
- `iva` (21 por defecto), `irpf` (15 o 7), `pay_days` (30)
- `rate` (tarifa €/h, 50), `extra_round` (precio de una ronda de cambios extra, 120)
- `capacity` (horas/semana, 30)
- `disciplines[]` (disciplinas que ofrece)
- `pay_online` {card, bizum}
- `prefs` {theme: system|light|dark, compact: bool}
- `onboarded` (bool; si es false se muestra el asistente §6.1)

### 4.2 Empresas (`companies`)
`name`, `nif`, `sector`, `address`, `email` (facturación), `phone`, `web`, `notes`,
`is_private` (particular → sin retención IRPF),
`brand` (jsonb: `colors` texto con HEX separados por comas, `fonts`, `tone`, `manual_file_id`).

### 4.3 Contactos (`contacts`)
`name`, `company_id?`, `role`, `nif`, `email`, `phone`, `type` (Cliente | Proveedor | Colaborador | Otro),
`status` (activo | potencial | inactivo), `tags[]`, `notes`.
Si es colaborador: `specialty` (disciplina), `rate` (€/h), `availability` (disponible | parcial | ocupado).
RGPD: `consent` (bool), `consent_date`, `consent_via` (Contrato | Formulario web | Email | Presencial | Teléfono).

### 4.4 Oportunidades (`deals`)
`title`, `discipline`, `company_id?`, `contact_id?`, `value` (sin IVA), `prob` (%),
`stage` (nuevo | contactado | propuesta | negociacion | ganado | perdido),
`expected` (fecha prevista de decisión), `source` (Web | Formulario web | Recomendación | Cliente actual | Redes sociales | Evento o feria | Contacto directo | Otro),
`notes`, `lost_reason` (Precio | Plazo | Eligió otro proveedor | Sin presupuesto | Sin respuesta | Otro),
`project_id?`, `closed_at?`.

### 4.5 Proyectos (`projects`)
`name`, `contact_id` (cliente), `discipline`, `start`, `end`,
`status` = fase: `briefing | investigacion | concepto | produccion | revisiones | entregado | pausa` (+ `prev_status` al pausar),
`priority` (baja | media | alta | urgente), `budget` (sin IVA), `hours_budget`, `rounds_included` (2 por defecto),
`desc`, `tags[]`,
`brief` (jsonb: `status` pendiente|enviado|completado, `sent_date`, `answers` {clave: texto}),
`portfolio` (jsonb: `featured`, `permission`, `summary`, `results`, `link`).
Tabla puente `project_collaborators (project_id, contact_id)`.

### 4.6 Entregables (`deliverables`)
`project_id`, `name`, `status` (en_curso | enviado | cambios | aprobado), `sent_at`, `approved_at`,
`billed_extra` (nº de rondas extra ya facturadas).
`deliverable_versions (deliverable_id, v, date, file_id?)`.
`deliverable_feedback (deliverable_id, date, text, from)` — cada registro es **una ronda de cambios**.

### 4.7 Tareas (`tasks`)
`title`, `due?`, `urgent`, `important`, `done`, `project_id?`, `contact_id?`,
`assignee_id?` (null = yo; si no, un colaborador), `estimate` (horas, 2 por defecto),
`repeat` ('' | diaria | semanal | mensual), `blocked_by?` (task_id), `next_created` (bool), `phase?`.

### 4.8 Reuniones / eventos (`events`)
`title`, `date`, `time?`, `contact_id?`, `project_id?`, `source` (null | google | reserva).

### 4.9 Presupuestos y facturas (`invoices`, `invoice_lines`, `payments`)
`invoices`: `kind` (factura | presupuesto), `series` (F facturas, R rectificativas, P presupuestos),
`number` (vacío hasta emitir en facturas), `status`
(facturas: borrador | emitida · presupuestos: borrador | enviado | aceptado | rechazado),
`company_id`, `contact_id?`, `project_id?`, `retainer_id?`, `deal_id?`, `from_quote_id?`, `rectifies_id?`,
`iva` (%), `irpf` (%), `date`, `due`, `notes`.
`invoice_lines`: `desc`, `qty`, `price` (sin IVA).
`payments`: `date`, `amount`, `method` (Transferencia | Bizum | Tarjeta | Efectivo | Domiciliación, + «(online)»).

### 4.10 Gastos (`expenses`)
`date`, `supplier`, `contact_id?` (colaborador o proveedor), `concept`, `category`
(Colaboradores | Software y suscripciones | Cuota de autónomos | Oficina | Imprenta y material | Publicidad | Formación | Transporte | Gestoría y bancos | Renovaciones de clientes | Otros),
`base`, `iva_pct` (21 | 10 | 4 | 0), `deductible`, `project_id?`, `receipt_file_id?`.

### 4.11 Igualas (`retainers`)
`name`, `company_id`, `contact_id`, `discipline`, `fee` (€/mes sin IVA), `hours` (incluidas/mes),
`billing_day`, `services`, `active`, `start`, `last_billed` ('YYYY-MM'), `extra_billed` ('YYYY-MM').

### 4.12 Renovaciones (`renewals`)
`company_id`, `type` (dominio | hosting | ssl | licencia | email), `name`, `provider`, `cost`, `price`, `renew_date`.

### 4.13 Accesos del cliente (`accesses`)
`company_id`, `service`, `url`, `user`, `password` **cifrada** (ver §10). Mostrar enmascarada con botón de ver y copiar.

### 4.14 Contenidos (`posts`)
`company_id?` (null = **mi marca**), `channel` (instagram | linkedin | tiktok | facebook | blog | newsletter | prensa | interna),
`date`, `time`, `title`, `copy`, `status` (idea | borrador | revision | aprobado | programado | publicado).

### 4.15 Horas (`time_entries`) y cronómetro
`date`, `minutes`, `project_id?` **o** `retainer_id?` (o ninguno = trabajo interno), `task_id?`, `note`, `billable`.
Cronómetro activo por usuario: `active_timer` {start timestamptz, project_id, retainer_id, task_id, note}.

### 4.16 Contratos (`contracts`)
`type` (proyecto | iguala | colaborador), `title`, `project_id?`, `retainer_id?`, `company_id?`, `contact_id`,
`deposit` (% anticipo), `ip` (cesion | licencia | colaborador), `portfolio` (bool), `scope`, `extra`,
`status` (borrador | enviado | firmado), `sent_at`, `signed_at`, `signed_by`,
**rastro de firma**: `signed_ip`, `signed_user_agent`, `document_hash` (SHA-256 del texto firmado), `pdf_file_id`.

### 4.17 Informes mensuales (`reports`)
`retainer_id`, `company_id`, `month` ('YYYY-MM'), `status` (borrador | enviado), `sent_at`,
`kpis` (jsonb), `prev` (jsonb, copia de los KPI del mes anterior), `summary`, `next`.

### 4.18 Otros
- `notes`: `text`, `color` (butter|peach|lilac|sage|sand), `pinned`, `contact_id?`, `project_id?`.
- `activities` (historial manual): `type` (nota | llamada | email | reunion), `text`, `date`, `contact_id?`, `project_id?`.
- `emails` (sincronizados): `contact_id`, `date`, `dir` (in|out), `subject`, `snippet`, `provider_message_id`.
- `files`: `name`, `size`, `mime`, `storage_path`, `contact_id?`, `company_id?`, `project_id?`.
- `automations`: `key`, `on`, `runs`, `last_run_at` (ver §6.20).
- `rgpd_log`: `date`, `action`, `detail` (**sin datos personales** del interesado tras un borrado).
- `integrations`: gmail/outlook/gcal (tokens OAuth cifrados), `booking` {slug, duration, hours}.
- `notification_reads`: claves de avisos ya leídos (los avisos se **calculan**, ver §7.9).
- `client_portal_tokens`: acceso del cliente por enlace mágico (ver §6.17).

---

## 5. Valores de referencia (catálogos)

**Disciplinas**: branding (melocotón) · grafico «Diseño gráfico» (mantequilla) · web «Diseño web» (lila) ·
desarrollo (salvia) · social «Redes sociales» (rosa) · seo «SEO y anuncios» (arena) ·
copy «Textos y copy» (mantequilla) · foto «Foto y vídeo» (niebla) · cint «Comunicación interna» (lila) ·
cext «Prensa y comunicación externa» (melocotón).

**Fases de proyecto**: Briefing → Investigación → Concepto → Diseño y desarrollo → Revisiones → Entregado (+ En pausa).

**Fases de oportunidad y probabilidad por defecto**: Nuevo 10 % · Contactado 20 % · Propuesta enviada 40 % · Negociando 70 % · Ganado 100 % · Perdido 0 %.

**Matriz de tareas (Eisenhower)**: Urgente e importante «Hazlo ya» (melocotón) · Importante, no urgente «Planifícalo» (mantequilla) ·
Urgente, no importante «Resuélvelo rápido o delega» (arena) · Ni urgente ni importante «Cuando tengas hueco» (lila).

**Plantillas de proyecto** (tarea, fase, día desde el inicio) — están completas en el prototipo (`const TPL`):
Web corporativa (60 h, 2 rondas) · Identidad de marca (35 h, 3 rondas) · Plan de redes sociales (20 h) ·
Pieza gráfica o editorial (25 h) · Desarrollo a medida (80 h) · Campaña SEO y anuncios (25 h) ·
Plan de comunicación interna (20 h) · Campaña de prensa (18 h). Cada una crea tareas con fecha y entregables.

**Preguntas del briefing**: 8 comunes + extra por disciplina (`BRIEF_BASE`, `BRIEF_EXTRA` en el prototipo).

**KPI de informes por disciplina**: `RKPI` en el prototipo (redes, comunicación interna, web, SEO y anuncios, genérico).

---

## 6. Pantallas y comportamiento

> Para cada pantalla, el prototipo muestra la maqueta exacta, los textos y los estados vacíos.

### 6.1 Asistente inicial (primer acceso)
5 pasos con puntos de progreso y «Ahora no»:
1. Nombre y estudio. 2. Disciplinas (chips multiselección).
3. ¿Autónomo/a o sociedad? Si autónomo/a: ¿menos de 3 años? (IRPF 7 % o 15 %). Sociedad → sin retención.
4. ¿A quién facturas? Empresas y autónomos / Particulares / De todo un poco.
5. Resumen con ejemplo («por 1.000 € de trabajo, te ingresarán 1.060 €») + NIF, IBAN y tarifa (opcionales).
Se puede repetir desde Perfil.

### 6.2 Inicio
Saludo por hora del día y resumen («Tienes 4 tareas para hoy, 2 reuniones y 5 cosas esperando respuesta del cliente»).
**Tarea rápida en lenguaje natural** (§7.10). 4 cifras: Te deben · Igualas al mes · Has ganado este trimestre · Horas esta semana.
Bloques: Para hoy · Esperando al cliente (entregables y briefings enviados, días de espera) · Proyectos en marcha (con barra de fases) ·
Próximas reuniones · Contenido de esta semana · Oportunidades más probables.

### 6.3 Oportunidades
Tablero kanban por fases con arrastrar y soltar. 4 cifras: En juego · Lo que probablemente cerrarás (ponderado) · Ganado 90 días · Propuestas que ganas.
Ganado/Perdido muestran solo los últimos 90 días. Insignia «Desde tu web» en las que vienen del formulario.
Botón **Formulario web** (§6.21).

### 6.4 Contactos
Lista con buscador y filtros (Todos · Clientes · Potenciales · Colaboradores · Inactivos) + ficha.
Ficha: datos, botones (copiar teléfono/email, **Escribir** correo con plantillas, Tarea, Reunión, Oportunidad),
oportunidades, proyectos, tareas, documentos, **historial unificado** (§7.11) con registro rápido (nota/llamada/email/reunión)
y bloque **Protección de datos** (permiso, «Darle sus datos», «Borrar sus datos») — §7.12.

### 6.5 Empresas
Lista + ficha: datos fiscales, «Le has facturado», «Te debe», botón **Ver su portal**,
**Kit de marca** (muestras de color que se copian al pulsar, tipografías, tono, manual),
**Accesos** (contraseñas enmascaradas), Personas, Igualas y renovaciones, Proyectos y oportunidades,
Contratos, Facturas, Documentos, Historial de la empresa.

### 6.6 Proyectos
Pestañas En marcha / En pausa / Entregados / Todos + filtro por disciplina. Tarjeta: disciplina, fase, barra de fases,
horas usadas/previstas (rojo si se pasa), tareas, entregables esperando al cliente, fechas, presupuesto y €/h reales.
**Panel del proyecto** (cajón lateral): fases pulsables + pausar/reanudar · cifras (entrega, presupuesto, facturado, gastos, te queda, €/h) ·
Briefing · **Contrato** · Entregables y revisiones · Tareas · Horas (+ cronometrar) · Equipo (colaboradores) ·
Facturas · Gastos · Documentos · Portfolio (si entregado) · Historial. Botón para ver el portal del cliente.

### 6.7 Tareas
Matriz 2×2 con arrastrar y soltar entre cuadros, añadir directamente en cada cuadro, filtro por proyecto, bloque «Hechas».
Cada tarea: casilla, título, fecha (rojo si atrasada), proyecto, contacto, **repetición**, **candado si depende de otra**,
responsable si es un colaborador, botón ▶ para cronometrar.

### 6.8 Horas y carga
Pestaña **Horas trabajadas**: semana en barras (hoy en melocotón), €/h real (6 meses), horas de igualas del mes, trabajo interno,
horas por proyecto frente a previstas, listado de las dos últimas semanas.
Pestaña **Carga de trabajo**: §7.8.

### 6.9 Contenidos
Calendario mensual y vista por estados (kanban, arrastrar). Filtros por cliente (incluye «Mi marca») y canal.
Cifras: esta semana · las revisa el cliente · hoy y mañana sin programar · ideas guardadas.

### 6.10 Calendario
Mes + agenda del día. Muestra reuniones, fechas límite de tareas, vencimientos de facturas y renovaciones.
Etiqueta «Sincronizado con Google Calendar» y «Reservada desde tu enlace».

### 6.11 Igualas y renovaciones
Igualas: tarjeta con cuota, día de facturación, horas del mes usadas/incluidas (verde/naranja/rojo), €/h del mes,
botones «Facturar {mes}», «Cobrar X h de más», «Informe de {mes anterior}». Renovaciones: tabla con estado
(Caducada / Renueva pronto ≤30 días / Al día) y «Renovar y facturar».

### 6.12 Contratos
Cifras (pendientes de firma, borradores, firmados, proyectos sin contrato), tabla, documento con cláusulas numeradas generadas (§7.6),
bloque de firmas y aviso «Plantilla orientativa».

### 6.13 Facturas (presupuestos y facturas)
Pestañas. Cifras de facturas: Cobrado este año · Te deben · Fuera de plazo · IVA cobrado este trimestre.
Cifras de presupuestos: sin respuesta · aceptados · % aceptados · esperando respuesta.
Acciones por fila: Emitir · Me ha pagado · Facturar · Ya lo he enviado.
**Editor** en modo sencillo (§7.2) y **vista del documento** con cobros, cobro online y recordatorios.

### 6.14 Gastos
Tabla con filtro por categoría, ticket adjunto (aviso de los que no tienen), barras por categoría del trimestre.

### 6.15 Informes
Ingresos vs gastos (6 meses, barras dobles), «Para tu gestoría» del trimestre (§7.5), **por disciplina** (facturado, horas, €/h; rojo si < tarifa),
lo que te deja cada proyecto, mejores clientes.

### 6.16 Colaboradores · Portfolio · Notas · Automatizaciones · Perfil
- **Colaboradores**: tarjetas con especialidad, tarifa, disponibilidad, proyectos, lo pagado; «Asignar a proyecto».
- **Portfolio**: casos (resumen, resultado medible, permiso del cliente), «Copiar texto», proyectos entregados sin caso.
- **Notas**: post-its de colores, fijables (aparecen en Inicio), vinculables.
- **Automatizaciones**: §6.20.
- **Perfil**: datos, «Cómo facturas» con ejemplo, protección de datos (registro de solicitudes), **Conexiones**, **Cobros online**, **Capacidad**, preferencias.

### 6.17 Portal del cliente (acceso externo)
URL propia por empresa, acceso por **enlace mágico** al email del contacto (sin contraseña), con la marca del estudio.
Saludo y nº de cosas pendientes. Secciones:
contratos para firmar (leer → nombre como firma + casilla de aceptación) · briefings para rellenar ·
entregables para revisar (vista previa del archivo, **Aprobar** / **Pedir cambios**, aviso de rondas incluidas restantes y coste de la extra) ·
presupuestos (Aceptar / No, gracias) · facturas (**Pagar ahora** con tarjeta/Bizum o transferencia) · informes · proyectos con su fase.
Cada acción del cliente queda en el historial y dispara las automatizaciones correspondientes.
En la app interna existe «Ver su portal» (vista previa como cliente).

### 6.18 Página pública de reservas
`/reservar/{slug}`: huecos libres (L–V 10:00–14:00 por defecto, duración configurable) excluyendo reuniones existentes;
nombre, email y motivo → crea la reunión (`source = reserva`) y la sincroniza con el calendario.

### 6.19 Buscador ⌘K
Busca en contactos, empresas, proyectos, oportunidades, tareas, entregables, contenidos, facturas, igualas, renovaciones,
gastos, documentos, notas, contratos y portales. Acciones de crear (con el texto escrito como título) e «Ir a…». Navegable con teclado.

### 6.20 Automatizaciones (interruptores)
| Clave | Cuando… | Entonces… |
|---|---|---|
| `won` | se gana una oportunidad | proyecto con plantilla de su disciplina + briefing enviado + contrato enviado |
| `signed` | el cliente firma el contrato | factura de anticipo (`deposit` % del presupuesto) **emitida** + aviso |
| `approved` | se aprueba el **último** entregable del proyecto | proyecto → Entregado + borrador de factura final (presupuesto − facturado) + tarea «Pedir opinión para el portfolio» |
| `lead` | llega un formulario web | contacto (con permiso RGPD) + empresa + oportunidad + tarea urgente «Llamar en 24 h» |
| `overdue` | factura a punto de vencer / vencida | emails al cliente: −3, +1, +7, +15 días respecto al vencimiento |
| `nudge` | entregable 5 días sin respuesta | email amable al cliente para revisarlo |
| `retainer` | día de facturación de cada iguala | factura de la cuota emitida automáticamente (desactivada por defecto) |
Cada una guarda nº de ejecuciones y última fecha. Página con «tiempo ahorrado» (10 min por ejecución).

### 6.21 Formulario web
Modal con vista previa (nombre, email, empresa, qué necesita —disciplinas del perfil—, presupuesto aproximado en tramos, mensaje, casilla RGPD obligatoria)
y código para incrustar. Endpoint público con protección anti-spam (honeypot + límite de peticiones).

---

## 7. Reglas de negocio

### 7.1 Cálculo de facturas
```
base  = Σ (qty × price)
iva   = base × iva%
irpf  = base × irpf%
total = base + iva − irpf          ← «Te ingresarán»
paid  = Σ payments.amount
pending = max(0, total − paid)
```
Redondeo a 2 decimales en cada paso.

**Estado derivado de una factura**: borrador → `borrador`; total < 0 → `rectificativa`;
paid ≥ total → `pagada`; vencida (`due` < hoy) → `vencida` («Fuera de plazo»); paid > 0 → `parcial` («Pagada en parte»); si no → `pendiente` («Esperando el pago»).

### 7.2 Editor de factura (modo sencillo)
Visible: cliente (empresa), proyecto opcional, líneas **concepto + precio**, totales con palabras llanas y «?».
En **Más opciones**: persona de contacto, fecha, fecha límite de pago, cantidades, IVA, retención, número (informativo), notas.
Al elegir proyecto se rellena cliente y contacto. Al elegir cliente se recalcula la retención y se muestra un aviso verde explicando por qué.

### 7.3 Numeración y emisión (requisito legal)
- Series: **F** facturas, **R** rectificativas, **P** presupuestos. Formato `F-2026-001`, correlativo por serie y año, **sin huecos**.
- Las facturas en borrador **no tienen número**. El número se asigna **al emitir**, de forma atómica (bloqueo o secuencia en BD).
- Una factura emitida **no se puede editar ni borrar**. Se corrige con una **rectificativa** (serie R) que copia las líneas en negativo y referencia la original.
- Presupuesto aceptado → «Aceptado: crear factura» copia sus líneas (`from_quote_id`) y marca la oportunidad como ganada.

### 7.4 Retención IRPF por defecto
`0` si `kind = sociedad`, si `irpf_mode = particulares` o si la empresa es `is_private`. Si no, `irpf` del perfil (15 o 7).

### 7.5 Resumen fiscal del trimestre (orientativo)
IVA repercutido (facturas emitidas del trimestre) − IVA soportado (gastos deducibles) = **IVA a pagar (modelo 303)**;
retenciones que te han hecho; ingresos sin IVA; gastos sin IVA; **rendimiento** = ingresos − gastos. Siempre con el aviso
«Cálculo orientativo. Revísalo con tu gestoría».

### 7.6 Contratos
Texto generado a partir de los datos (ver función `clauses()` del prototipo):
- Proyecto: Objeto (+ entregables) · Plazos (los retrasos del cliente desplazan la entrega) · Precio y pago (anticipo % + resto a la entrega, plazo de pago) ·
  Rondas de cambios (incluidas + precio de la extra) · Propiedad intelectual (según `ip`) · Portfolio (si procede) · Cancelación · Confidencialidad · Otras condiciones.
- Iguala: Servicio · Cuota y día de facturación · Horas incluidas y precio de la extra · Duración (mensual, preaviso 30 días) · Propiedad intelectual · Confidencialidad.
- Colaborador: Objeto · Tarifa y pago · Plazos · Propiedad intelectual (pasa al estudio al pagar) · Confidencialidad.
Firma: nombre escrito + aceptación explícita + registro de IP, navegador, fecha y hash del documento; se genera el PDF firmado.
Para mayor validez legal, valorar un proveedor de firma electrónica (ver §11).

### 7.7 Entregables y rondas
Enviar versión N → estado «Esperando al cliente». «Pide cambios» añade una ronda; si `rondas usadas > rounds_included`
se muestra «X rondas extra» y el botón **Cobrar rondas extra** añade una línea `qty × extra_round` al **borrador de factura** del cliente
(crea uno si no existe) y actualiza `billed_extra`. «Lo aprueba» → aprobado (+ automatización `approved`).

### 7.8 Carga de trabajo
4 semanas desde el lunes actual. Para cada persona (yo + colaboradores):
`carga = Σ estimate` de tareas abiertas con fecha en esa semana asignadas a esa persona
(las atrasadas cuentan en la semana actual). Para mí se suman además las horas de igualas activas / 4,3 por semana.
Capacidad: yo = `capacity`; colaboradores = disponible 25 h · parcial 12 h · ocupado 0 h.
Color: ≤80 % verde, ≤100 % melocotón, >100 % rojo. Calculadora «¿Puedes aceptar un proyecto de X h/semana?» →
primera semana con hueco y colaboradores con ≥4 h libres.

### 7.9 Avisos (campana)
Calculados en cada carga (con estado leído/no leído): tareas atrasadas y de hoy · reuniones de hoy y mañana ·
contratos sin firmar >3 días · proyectos en marcha sin contrato · contactos nuevos de la web (≤2 días) ·
entregables esperando ≥5 días · rondas extra sin cobrar · briefings sin rellenar ≥3 días · igualas por facturar ·
igualas al ≥90 % de horas · renovaciones ≤15 días o caducadas · publicaciones de hoy/mañana sin programar ·
facturas fuera de plazo · borradores sin emitir · presupuestos enviados >14 días · oportunidades con fecha pasada ·
informes mensuales sin preparar · contactos sin permiso RGPD · clientes sin contacto ≥30 días.

### 7.10 Tarea rápida en lenguaje natural
Reconoce `hoy`, `mañana`, `pasado mañana`, días de la semana (próxima ocurrencia), `urgente` o `!`, `importante`,
`@contacto` (busca por nombre y vincula su proyecto activo) y `#proyecto`. Muestra una vista previa antes de crear.
Sin prioridad explícita → importante.

### 7.11 Historial unificado
Para contacto, empresa o proyecto mezcla por fecha: apuntes manuales, tareas, reuniones, facturas y presupuestos,
oportunidades, notas, documentos, **correos sincronizados**, contratos (enviado/firmado) y entregables (versiones, rondas, aprobación).

### 7.12 Protección de datos (RGPD)
- Permiso por contacto (fecha y vía). El formulario web exige la casilla.
- **Darle sus datos**: exporta en JSON (y PDF) todo lo guardado sobre la persona; queda en el registro.
- **Borrar sus datos**: elimina ficha, apuntes, reuniones, notas, documentos y correos; desvincula tareas, oportunidades y gastos;
  **conserva facturas sin su nombre** (obligación legal de conservación). Queda en el registro sin datos personales.

### 7.13 Tareas que se repiten y dependencias
Al completar una tarea que se repite se crea la siguiente (+1 día, +7 días o +1 mes desde su fecha o desde hoy si ya pasó). Deshacer la elimina.
Una tarea bloqueada (su `blocked_by` no está hecha) no se puede completar: aviso «Primero hay que terminar «X»». Al terminar la bloqueante: «Ya puedes empezar «Y»».

### 7.14 Igualas
«Por facturar» si está activa, no se ha facturado este mes y hoy ≥ `billing_day`. «Facturar {mes}» crea el borrador con la cuota.
Horas de más del mes × `rate` → «Cobrar X h de más» (una vez por mes).

### 7.15 Renovaciones
«Renovar y facturar»: añade la línea al borrador del cliente, registra el gasto (`cost`) y mueve `renew_date` +1 año.

---

## 8. Sistema de diseño

### 8.1 Tokens de color (modo claro)
```css
--bg:#f3f5f1; --surface:#ffffff; --surface-2:#f8f9f6; --line:#e2e7df;
--fg:#283029; --muted:#667068; --faint:#98a199;
--sage:#d3dfcd;   --sage-strong:#5b7a57; --sage-ink:#2f4a2d;
--peach:#fbdccd;  --peach-ink:#8a4630;   --peach-strong:#ec9473;
--butter:#fcefc3; --butter-ink:#76590f;
--sand:#f1e4d0;   --sand-ink:#6b5230;
--lilac:#dfdbf0;  --lilac-ink:#4a4380;
--mist:#e8eae7;   --mist-ink:#545b55;
--rose:#f8d3cf;   --rose-ink:#9a3527;
--danger:#c24e3c; --ok:#4c8754;
```
### 8.2 Tokens de color (modo oscuro)
```css
--bg:#151916; --surface:#1d231f; --surface-2:#222924; --line:#2e3731;
--fg:#e6ebe5; --muted:#a2aca3; --faint:#6f7a71;
--sage:#2a382a;   --sage-strong:#9cc196; --sage-ink:#d2e6cc;
--peach:#42302a;  --peach-ink:#f3c3ad;   --peach-strong:#e8977a;
--butter:#3b3420; --butter-ink:#ecd890;
--sand:#383026;   --sand-ink:#e6d0af;
--lilac:#2e2b44;  --lilac-ink:#cbc4f1;
--mist:#29302b;   --mist-ink:#c4cbc5;
--rose:#452825;   --rose-ink:#f3b0a5;
--danger:#ea8571; --ok:#8cc792;
```
Tema: sistema / claro / oscuro (`data-theme` en `<html>`). Los colores pastel se usan **por significado**
(estado, prioridad, cuadrante, canal, disciplina), nunca decorativos al azar.

### 8.3 Tipografía
- Logo: **Caveat** 700 («nebúla»; plegado «n.»).
- Títulos: **Outfit** 400–600.
- Texto: **Manrope** 400–700. Cifras con `tabular-nums`.

### 8.4 Componentes
Tarjetas radio 16–18 px con borde fino; «pills» de estado; botón principal melocotón (`--peach-strong`, texto blanco);
modales con cabecera/pie; cajón lateral para detalle (proyecto, factura, contrato, informe); avisos tipo *toast* con «Deshacer»;
ayuda «?» con burbuja al pasar el ratón o al enfocar (táctil); estados vacíos que explican qué hacer.
Accesible: foco visible, `aria-label` en botones de icono, `prefers-reduced-motion`. Responsive hasta 400 px.

---

## 9. Textos

### 9.1 Tono
Cercano, en segunda persona («tú»), frases cortas. Botones que dicen lo que hacen («Emitir factura», «Me ha pagado», «Apuntar pago»).

### 9.2 Glosario de interfaz
Base imponible → «Sin IVA» / «Tu trabajo (sin IVA)» · Total → «Te ingresarán» · Pendiente de cobro → «Te deben» ·
Vencida → «Fuera de plazo» · Cobro parcial → «Pagada en parte» · Rendimiento neto → «Lo que has ganado» ·
Margen → «Te queda» · MRR → «Ingresos fijos al mes» · Pipeline → «En juego» · Previsión ponderada → «Lo que probablemente cerrarás».

### 9.3 Ayudas «?» (texto exacto en `HELP` del prototipo)
base, iva, irpf, rect, borrador, numero, ingresaran, prevision, iguala, rondas, eurh, margen, iva303, rgpd, renov, deducible, rendimiento.

---

## 10. Seguridad, privacidad y cumplimiento
- **RLS** en todas las tablas por `workspace_id`. El portal del cliente solo ve datos de **su** empresa, con token firmado y caducable.
- **Contraseñas de clientes** (`accesses.password`) y tokens OAuth **cifrados** (p. ej. Supabase Vault/pgsodium o AES-GCM con clave en variables de entorno). Nunca en registros ni en analítica.
- Datos alojados en la **UE**. Copias de seguridad diarias.
- **Inicio de sesión**: email (enlace mágico o contraseña) y Google; verificación en dos pasos opcional.
- **Pagos**: nunca tocar datos de tarjeta; usar el checkout de la pasarela y **webhooks** para apuntar el pago.
- **Verifactu / facturación electrónica**: las facturas deben poder cumplir la normativa española (registro, QR, leyenda).
  **Verificar plazos y requisitos vigentes antes de desarrollar** y valorar integrarse con un proveedor homologado.
  En el prototipo solo hay un hueco reservado para el QR.
- Plantillas de contrato: mostrar siempre «Plantilla orientativa; revísala con un profesional».

---

## 11. Decisiones abiertas (preguntar a la persona responsable del producto)
1. Proveedor de pagos para **Bizum** (Stripe no lo ofrece de forma general en España; valorar Redsys u otra pasarela).
2. **Firma electrónica**: firma simple propia con rastro de auditoría (fase inicial) o proveedor externo (Signaturit, Docusign…).
3. **Verifactu**: desarrollo propio o proveedor homologado.
4. Nombre de dominio y URL del portal y reservas.
5. Planes de precio / suscripción del producto (si se comercializa).

---

## 12. Fases de desarrollo

Cada fase debe terminar **desplegada y usable**, con pruebas de las reglas de negocio de §7.

| Fase | Contenido | Hecho cuando… |
|---|---|---|
| **0. Base** | Repositorio en GitHub, conexión con Vercel y Supabase, stack, auth, `workspace`, tokens de diseño, manifiesto PWA (instalable), layout (barra lateral plegable, barra superior, «+», modo oscuro), asistente inicial, perfil | Se puede entrar, completar el asistente y navegar por el esqueleto |
| **1. Núcleo CRM** | Empresas, contactos, oportunidades (kanban), proyectos (fases, plantillas, panel), tareas (matriz, repetir, dependencias, tarea rápida), calendario, notas, documentos, historial, buscador ⌘K, avisos | Flujo «contacto → oportunidad ganada → proyecto con plantilla» completo |
| **2. Dinero** | Presupuestos, facturas (modo sencillo, numeración, emisión, rectificativas, PDF), pagos manuales, gastos con ticket, igualas, renovaciones, informes y resumen fiscal, ayudas «?» | Se emite una factura correcta en PDF y cuadran los informes |
| **3. Trabajo creativo** | Briefing, entregables y rondas, horas y cronómetro, carga de trabajo, contenidos, colaboradores, kit de marca y accesos cifrados, portfolio | Un proyecto se gestiona de principio a fin dentro de nebúla |
| **4. Cliente** | Portal con enlace mágico, contratos con firma, pagos online + webhooks, recordatorios por email, informes mensuales, formulario web, página de reservas, automatizaciones | Un cliente firma, aprueba y paga desde su portal y nebúla reacciona solo |
| **5. Integraciones y cierre** | Gmail/Outlook, Google Calendar (bidireccional), RGPD (exportar/borrar), PWA sin conexión (modo offline), Verifactu, importar/exportar CSV, copias de seguridad | Listo para uso real diario |

---

## 13. Criterios de aceptación clave (pruebas automáticas)
- Numeración correlativa sin huecos por serie y año, también con emisiones simultáneas.
- Una factura emitida no se puede modificar por API.
- `total = base + iva − irpf` y estados derivados en todos los casos (incluidos parciales y rectificativas).
- Retención por defecto según §7.4.
- Rondas extra: el contador y el importe a cobrar son correctos y no se facturan dos veces.
- Repetición y dependencias de tareas según §7.13.
- Automatizaciones: cada disparador ejecuta exactamente sus acciones una vez.
- Portal: un cliente no puede ver datos de otra empresa (prueba de RLS).
- Borrado RGPD: no quedan datos personales salvo las facturas anonimizadas.

---

## 14. Modo demostración y registro (añadido en la Fase 0, decidido con la persona responsable)

### 14.1 Entrada
`/entrar` ofrece tres caminos: **Entrar** (email y contraseña, enlace mágico por email o Google), **Crear usuario** (`/registro`)
y **Probar la demostración** (sin registro).

### 14.2 Modo demostración
- La app es la misma, pero los datos se guardan **solo en el navegador** (`localStorage`, clave `nebula-demo`) y nunca tocan Supabase.
- Empieza con los **datos de ejemplo del prototipo** (`seed()` y `ext()`). **Regla para cada fase:** toda pantalla nueva debe verse en la demo
  ya rellena con sus datos ficticios y permitir crear, editar y borrar más, igual que con una cuenta real.
- Barra superior: aviso «Modo demostración» con ayuda «?» y botón **«Crear usuario»** → `/registro?desde=demo`.
- Perfil: «Empezar de cero la demo» y «Salir de la demostración».
- Lo que necesita servidor (correos, portal del cliente, cobros, firma, Gmail/Calendar) se **simula** en la demo, como en el prototipo.
- Todas las pantallas leen y escriben a través de una interfaz común (`Almacen`, `src/lib/datos/tipos.ts`) con dos
  implementaciones: demo (navegador) y nube (Supabase). Cada nueva funcionalidad debe funcionar en las dos.

### 14.3 Registro con aprobación
- Formulario: nombre y apellidos, email, contraseña (mín. 8) y casilla obligatoria de política de privacidad;
  o «Registrarme con Google» (exige marcar antes la casilla). Protección anti-spam: campo trampa oculto, tiempo mínimo y límites de Supabase.
- Se confirma el email y la cuenta queda **pendiente**: no puede ver ni escribir nada (RLS) y ve `/pendiente`.
- Quien administra (tabla `app_admins`) aprueba o rechaza en **Perfil → Solicitudes de acceso**. Al aprobar se crea su
  **espacio de trabajo vacío** con los ajustes por defecto. Rechazar una cuenta aprobada le retira el acceso.
- Al registrarse desde la demo **no** se llevan los datos de ejemplo; solo las respuestas del asistente si lo completó
  (se guardan en `profiles.signup_data` y rellenan el asistente al entrar por primera vez).
- **Pendiente:** email «ya estás aprobado/a» (cuando haya servicio de correo); texto legal de la política de privacidad
  y condiciones de uso (lo debe redactar o revisar un profesional).

### 14.4 Ajuste al modelo de datos (§4.1)
`profiles` es **por persona** (clave = usuario; no lleva `workspace_id`, porque una persona podrá pertenecer a varios espacios):
nombre, cómo saludar, rol, email, teléfono, `prefs`, `status` (pendiente | aprobado | rechazado), `privacy_accepted_at`, `signup_data`.
`workspace_settings` es **por espacio**: estudio, datos fiscales, IVA/IRPF, tarifa, capacidad, disciplinas, cobros online, `onboarded`.
`workspaces` + `workspace_members` (rol `owner` | `member`) y la función `is_member(workspace_id)`, que exige cuenta aprobada,
son la base de las reglas RLS de todas las tablas futuras.
