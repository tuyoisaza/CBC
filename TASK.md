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
