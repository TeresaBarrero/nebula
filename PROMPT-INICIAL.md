# Primer mensaje para Claude Code

Copia y pega esto en Claude Code, con esta carpeta abierta como proyecto:

---

Hola. Vamos a construir **nebúla**, un CRM para profesionales creativos 360º.

En esta carpeta tienes:
- `SPEC.md`: la especificación completa (producto, modelo de datos, pantallas, reglas de negocio, diseño y fases).
- `CLAUDE.md`: cómo quiero que trabajes.
- `prototipo/nebula-prototipo.html`: un prototipo funcional que es la referencia visual y de comportamiento. Ábrelo y úsalo como guía para cada pantalla.

Antes de escribir código:
1. Lee `SPEC.md` y `CLAUDE.md` completos y revisa el prototipo.
2. Hazme un **plan de la Fase 0** (estructura del proyecto, stack, esquema inicial de base de datos, cómo vas a trasladar los tokens de diseño y el layout).
3. Hazme las preguntas que necesites sobre las decisiones abiertas de SPEC §11 que afecten a esta fase.

Cuando apruebe el plan, desarrolla la Fase 0 completa. Al terminar, enséñame cómo probarla y resume qué queda para la Fase 1.

No avances a la siguiente fase sin mi confirmación.

---

## Mensajes para las siguientes fases

Cuando una fase esté terminada y la hayas probado:

> La Fase N está bien. Pasa a la Fase N+1 siguiendo `SPEC.md` §12. Primero enséñame el plan.

Si algo no se parece al prototipo:

> En la pantalla X no se parece al prototipo: [describe la diferencia]. Revisa cómo está hecho en `prototipo/nebula-prototipo.html` y ajústalo.
