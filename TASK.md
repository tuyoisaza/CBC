# TASK — Leads solo de contacto (2026-11-05)

- [x] Quitar tipo de caja, cantidad y ocasión de ambos formularios de lead, extracción y validación admin.
- [x] Dejar cotización como paso opcional posterior, sin cambiar mínimos ni precios.
- [x] Quitar Ver leads de Pedidos y permitir scroll horizontal de la tabla sin cambiar filtros.
- Verificación y entrega: evidencia local posterior al merge; sin UAT ni cambios de datos históricos.

---

# TASK — Ayuda de configuración en Sistema (2026-11-05)

## Solicitud actual
Explicar qué es cada opción de Sistema, para qué se necesita y dónde obtenerla, tanto configurada como ausente; retirar la cuenta vinculada de Mercado Pago de Sistema y conservarla en Pagos.

## Alcance y entrega
- [x] Ayuda visible para las 12 opciones existentes y estado textual de presencia.
- [x] Indicar obligatoriedad según función, origen y lugar de guardado; enlaces a guías oficiales disponibles.
- [x] Aclarar que presencia no valida credenciales ni conectividad; no mostrar secretos.
- [x] Eliminar tarjeta y consulta remota duplicadas de Mercado Pago; Pagos queda intacto.
- [x] TypeScript, ESLint, build de producción y revisión completa del diff.
- [ ] Entrega normal por rama/PR a main, versión v1.6.80; el resultado posterior al merge se registra en PHDK_DELIVERY_EVIDENCE.json.

La solicitud actual autoriza esta entrega. No activa trabajos históricos, UAT, gasto nuevo ni cambios de configuración externa. El worktree original con cambios ajenos queda intacto. La evidencia posterior al merge se conserva localmente en PHDK_DELIVERY_EVIDENCE.json.

---

# TASK — Acceso Mensajes (2026-11-05)

- [x] Mostrar Mensajes en el menú izquierdo, después de Pedidos, enlazado a /admin/service.
- [x] Convertir mensajes entrantes en formulario prellenado revisable; conservar original y evitar duplicados al vincular.
- Validación y entrega: ver evidencia local posterior al merge; no UAT ni envíos reales.

---

# TASK — Dashboard, leads y cotizaciones (2026-11-05)

## Solicitud actual
Corregir las discrepancias del dashboard y sus enlaces, aclarar mensajes sin leer en Servicio, reparar el 404 de Nuevo lead y conectar creación de cotizaciones y envío por correo desde el mismo lead.

## Implementación
- [x] Compartir filtros entre contadores y listas; excluir leads archivados y pedidos de prueba/no concretados de los indicadores correspondientes.
- [x] Accesos separados a leads/pedidos; mensajes totales y sin leer con paginación y estados visibles.
- [x] Crear lead desde una ruta real y protegida; opción Crear lead y cotizar.
- [x] Reutilizar el cotizador con lead existente, importes calculados en servidor y guardado sin enviar correo automáticamente.
- [x] Enviar la cotización guardada al correo del cliente mediante acción explícita, con validación, resultado de proveedor y registro de fecha/auditoría.
- [x] Typecheck, lint de archivos cambiados y build de producción completados.
- [x] Entregado en main por PR #12, commit 6800f47, v1.6.78.

## Límites de evidencia
No se consultaron registros de clientes en producción ni se enviaron mensajes reales. Los conteos exactos y el comportamiento desplegado siguen sin verificación de runtime. UAT NOT RUN. No se reanudan las solicitudes históricas siguientes.

---

# TASK — Estadísticas y programación social de noviembre de 2026

## Solicitud actual
El propietario pidió programar noviembre con la recomendación de horarios y subir la evidencia a CBC/docs/stats para comparar el próximo mes cantidad, estilo, frecuencia y horas.

## Alcance
- Guardar la base de Meta del 27 de septiembre al 24 de octubre y sus CSV originales.
- Programar las 60 piezas existentes en Facebook e Instagram, con 30 a las 11:00, 15 a las 16:00 y 15 a las 19:00 por red, hora de CDMX.
- Mantener trazabilidad por pieza y una plantilla de resultados a siete días.
- Entregar la documentación en main por rama/PR, sin tocar cambios ajenos ni configurar automatizaciones de seguimiento.

## Evidencia y límites
Ver [docs/stats/README.md](docs/stats/README.md). La carga masiva de Meta rechaza fechas más allá de 29 días; el editor individual tampoco permite las fechas finales. No marcar borradores como programados. La programación de contenido autorizada es una operación editorial externa, no verificación de código ni UAT. No se inició ningún PHDK auto/PMO/UAT ni proceso recurrente.

## Resultado del corte

- [x] Conservar CSV originales y panorama de octubre con límites y método reproducible.
- [x] Definir y validar 120 destinos, zona/UTC, reparto 30/15/15 y dos publicaciones diarias por red.
- [x] Verificar 88 destinos programados, del 1 al 22 de noviembre.
- [x] Guardar y verificar 16 borradores compartidos para los últimos 32 destinos.
- [ ] Activar los últimos 32 destinos desde el 2 de noviembre: bloqueo externo de ventana, no falta de autorización.

La entrega documental al repositorio es independiente de ese bloqueo editorial. El siguiente análisis mensual y su medición no se ejecutan ni se programan en esta solicitud.

La solicitud anterior y sus verificaciones quedan conservadas abajo como historia, sin reactivar su trabajo.

---

# TASK — Simplify the B2B homepage image teaser

## Authorization and scope
Current request: Make the homepage B2B teaser more subtle by removing visible headings, item names, and catalog buttons; reduce image cards to about one quarter of their previous size; and make the images scroll automatically.

In scope: the shared Spanish/English B2B teaser component, its carousel styling, and release metadata for this change.
Out of scope: catalog content or destinations, Analytics/Clarity configuration, admin integrations, provider settings, direct deployment, and release tags.
Delivery target: remote `main` through the normal feature branch and pull request flow, per the current owner instructions.

## Acceptance
- [x] Show only small catalog images; each image still opens the corresponding full catalog.
- [x] Remove the visible heading, item names, arrows, per-item text, and final catalog button.
- [x] Automatically loop the image strip in Spanish and English.
- [x] Pause on hover/focus and honor the reduced-motion preference.
- [x] Complete local TypeScript, production build, and diff checks.

## Verification
Prisma Client generation, `pnpm --filter @cbc/web typecheck`, `pnpm --filter @cbc/web build`, and `git diff --check` passed. No browser or live-site check was run.
