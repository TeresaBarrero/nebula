# CLAUDE.md — instrucciones para desarrollar nebúla

## Qué es
nebúla es un CRM para profesionales creativos 360º (autónomos y pequeñas agencias de diseño, web,
marketing y comunicación). La especificación completa está en `SPEC.md` y la referencia visual y de
comportamiento es `prototipo/nebula-prototipo.html` (ábrelo en un navegador; es un único archivo con
todo el HTML, CSS y JS, y datos de ejemplo).

## Con quién trabajas
La persona responsable del producto **no es programadora** (conoce algo de HTML/CSS y WordPress). Por tanto:
- **Explica cada paso en lenguaje sencillo**, sin dar por sabido nada técnico. Si usas un término (repositorio, rama, variable de entorno, migración…), explícalo en una frase la primera vez.
- Antes de ejecutar un comando, di **para qué sirve**. Si tiene que hacer algo fuera de VS Code (crear una cuenta, pulsar un botón en GitHub, Vercel o Supabase), dale las instrucciones **clic a clic**.
- Toma tú las decisiones puramente técnicas y cuéntaselas en una línea. Pregunta solo lo que afecte al producto, al coste o a lo legal.
- Al terminar cada fase, dile **cómo probarlo** en su navegador y en su móvil.
- Trabaja en **VS Code** con la extensión de Claude Code.

## Entorno confirmado
- **TypeScript + Next.js**, base de datos y usuarios en **Supabase (UE)**.
- Código en **GitHub** (repositorio privado). Guarda el trabajo con *commits* pequeños y frecuentes, con mensajes en español que se entiendan («Añade la pantalla de contactos»).
- Publicación automática con **Vercel conectado a GitHub**.
- **Web instalable (PWA)** desde la Fase 0. Sin apps nativas.
- Las claves y contraseñas de servicios van en variables de entorno (`.env.local`, nunca en GitHub); explícale cómo copiarlas.

## Cómo trabajar
- **Lee `SPEC.md` entero antes de empezar** y consulta el prototipo para cada pantalla.
  Si el prototipo y la especificación se contradicen, manda la especificación y pregunta.
- Trabaja **por fases** (SPEC §12). Al terminar cada fase: pruebas en verde, despliegue y un resumen
  breve de lo hecho y lo pendiente. No empieces la siguiente fase sin confirmación.
- Antes de decisiones con impacto (proveedor de pagos, firma electrónica, Verifactu, cambios de stack)
  **pregunta**. Están listadas en SPEC §11.
- No inventes reglas fiscales. Si algo legal no está claro, déjalo marcado como pendiente y avisa.

## Reglas de producto que no se negocian
- Interfaz **en español de España**, tono cercano, lenguaje llano (SPEC §9). Fechas `es-ES`, euros, semana desde el lunes.
- Términos técnicos siempre con ayuda «?» (textos en el objeto `HELP` del prototipo).
- **Modo sencillo** por defecto; lo avanzado en «Más opciones».
- Tokens de color y tipografías exactamente como en SPEC §8. Modo claro y oscuro. Responsive hasta 400 px.
- Facturas: numeración correlativa sin huecos asignada al **emitir**; emitida = inmutable; correcciones con rectificativa (SPEC §7.3).

## Calidad
- TypeScript estricto. Lógica de negocio (cálculos de facturas, estados, rondas, carga, repeticiones,
  automatizaciones) en funciones puras con **pruebas unitarias** (SPEC §13).
- Row Level Security en todas las tablas por `workspace_id`; prueba explícita de que el portal de un cliente no ve datos de otro.
- Secretos (contraseñas de clientes, tokens OAuth) cifrados. Nunca en logs.
- Accesibilidad: foco visible, `aria-label` en botones de icono, `prefers-reduced-motion`.

## Dónde mirar en el prototipo
Busca estas constantes y funciones en `prototipo/nebula-prototipo.html`:
- Catálogos: `DISC`, `PH`, `FLOW`, `STG`, `QUADS`, `IST`, `DLV`, `CH`, `PST2`, `RN`, `AVAIL`, `KST`, `IP`, `AUTO`, `RKPI`, `REP`
- Plantillas y briefing: `TPL`, `BRIEF_BASE`, `BRIEF_EXTRA`, `MAILTPL`
- Textos de ayuda: `HELP`
- Reglas: `tot`, `invState`, `nextNumber`, `defaultIrpf`, `roundsOf`, `projectMoney`, `retDue`, `rnState`, `loadOf`, `capOf`,
  `parseQuick`, `clauses`, `setDealStage`, `approveDeliverable`, `signContract`, `createDeposit`, `notifications`
- Datos de ejemplo realistas: función `seed()` y `ext()` (útiles para el *seed* de desarrollo)
