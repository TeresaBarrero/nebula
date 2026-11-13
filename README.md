# nebúla · paquete para Claude Code

Todo lo necesario para que Claude Code construya la aplicación real de nebúla.

| Archivo | Para qué sirve |
|---|---|
| `PROMPT-INICIAL.md` | El primer mensaje que pegas en Claude Code (y los de las siguientes fases) |
| `SPEC.md` | La especificación completa: qué hace cada pantalla, el modelo de datos, las reglas y el diseño |
| `CLAUDE.md` | Las normas de trabajo que Claude Code lee automáticamente al abrir la carpeta |
| `prototipo/nebula-prototipo.html` | El prototipo funcional. Ábrelo con doble clic en tu navegador |

## Pasos

1. **Descomprime** este paquete en la carpeta donde quieras guardar el proyecto.
2. **Ábrelo en VS Code** (Archivo → Abrir carpeta…) e instala la extensión **Claude Code** de Anthropic.
3. **Inicia sesión** en Claude Code con tu cuenta de Claude.
4. **Pega el mensaje** de `PROMPT-INICIAL.md`.
5. **Revisa el plan** que te propone, contesta sus preguntas y apruébalo.
6. **Ve fase a fase** (son 6, de la 0 a la 5). Al final de cada una, pruébala y da el visto bueno antes de seguir.

## Lo que tendrás que decidir por el camino
Claude Code te preguntará por esto cuando llegue el momento (detalle en `SPEC.md` §11):
- Pasarela para cobrar con **Bizum** (con tarjeta se usará Stripe).
- **Firma de contratos**: sencilla propia o con un proveedor externo.
- **Verifactu** (la normativa de facturación de Hacienda): desarrollarlo o usar un proveedor homologado.
- Dominio web para la app, el portal de clientes y la página de reservas.

## Cómo encaja todo
- **VS Code + Claude Code**: donde se escribe la app (en tu ordenador).
- **GitHub**: donde se guarda el código, con todas sus versiones.
- **Vercel** (conectado a GitHub): publica la web sola cada vez que se guarda un cambio.
- **Supabase**: guarda los datos (clientes, facturas…) en servidores europeos.

## Cuentas que necesitarás (gratis para empezar)
- **GitHub**, **Vercel** y **Supabase**. Puedes entrar en Vercel y Supabase con tu cuenta de GitHub.
- Más adelante: **Stripe** (pagos) y un servicio de correo (p. ej. Resend).

Claude Code te guiará para conectarlas cuando haga falta.
