## 2026-10-25 — Base de redes y experimento de noviembre (v1.6.77)

- Registrar resultados de Meta del 27 de septiembre al 24 de octubre, fuentes CSV y límites del análisis.
- Definir 60 piezas para Facebook e Instagram: 30 a las 11:00, 15 a las 16:00 y 15 a las 19:00 por red, hora de CDMX.
- Conservar el estado efectivo de programación y la plantilla del próximo corte en [docs/stats](docs/stats/README.md).
- Meta: 44 piezas verificadas como programadas en ambas redes (88 destinos); 16 guardadas como borradores compartidos. Los 32 destinos del 23 al 30 esperan la ventana de 29 días; activación posible desde el 2 de noviembre, sin seguimiento automático.
- Verificación documental y de consistencia de los datos; sin cambios de lógica de aplicación ni pruebas de runtime.

## 2026-10-23 — PHDK 2.65.1 compatibility maintenance (v1.6.76)

- Adopt the published canonical mechanical formatting patch `d4ed10e96f5fd05ebeaa38a664442d7d10d6cf86` with all 78 manifest mappings verified.
- Preserve the installed Stack Security Review contract and all project controls; no runtime, framework or dependency resolution changes.
- Source and verification: [docs/phdk/standards/2026-10-23-v2.65.1.md](docs/phdk/standards/2026-10-23-v2.65.1.md). The preceding 2.65.0 rollout and product history remain preserved below.

## 2026-10-23 — PHDK 2.65.0 standards maintenance (v1.6.75)

- Vendor all 78 canonical manifest resources from `9fc6605c75b42e678bab41feb741dca71fcbabcc` and synchronize exact native managed blocks.
- Preserve project-specific owner rules and architecture; package changes are required release metadata only.
- Review stack security on this upgrade and future explicit upgrades. Findings and coverage: [docs/phdk/STACK_SECURITY_REVIEW_2026-10-23.md](docs/phdk/STACK_SECURITY_REVIEW_2026-10-23.md).
- Static scope/provenance: [docs/phdk/standards/2026-10-23-v2.65.0.md](docs/phdk/standards/2026-10-23-v2.65.0.md). Application security, publication gates and live deployment retain their separately evidenced status.

## 2026-10-11 — Carrusel sutil de imágenes B2B (v1.6.73)

- Reducir la vista previa a imágenes de 88 × 66 px en un carrusel automático, sin nombres, encabezados ni botones visibles.
- Mantener cada imagen enlazada al catálogo completo; pausar el movimiento al enfocar y respetar la preferencia de movimiento reducido.
- Aplicar el cambio en las portadas en español e inglés.
- Verificación: generación de Prisma Client, typecheck de web, build de Next.js y `git diff --check` completados.

## 2026-10-10 — Google tag disponible desde el HTML inicial (v1.6.71)

- Leer los IDs de GA4 y Clarity guardados por superadmin durante el render del servidor; conservar la base de datos como fuente y no usar variables de entorno.
- Inicializar Google Consent Mode avanzado antes de hidratar React y cargar gtag en rutas públicas; mantener excluidas administración, login, seguimiento, salud y APIs.
- Verificación: TypeScript (`apps/web`, `tsc --noEmit`), build de Next.js y `git diff --check` pasaron. El build mostró avisos no fatales porque este worktree no tiene el Query Engine local de Prisma; no se consultó la base de datos ni se verificó el runtime en producción.

## 2026-10-10 — Consentimiento avanzado para GA4 (v1.6.70)

- Cargar GA4 en páginas públicas con `analytics_storage: denied` y enviar vistas de ruta sin parámetros antes de la elección o si se rechazan cookies.
- Habilitar el almacenamiento analítico sólo después de aceptar; mantener Microsoft Clarity detrás de la aceptación.
- Renovar la clave de consentimiento guardado y explicar el comportamiento en los avisos español/inglés y la configuración superadmin.
- Comprobación de Analytics: el Measurement ID coincide; Google indica que no recibió datos en 48 horas y la URL del flujo está registrada como `http://coffeebunncafe.com`.
- `pnpm --filter @cbc/db build` (generación de Prisma Client), `pnpm --filter @cbc/web typecheck` y `git diff --check` pasaron. Sin cambios en configuración del proveedor ni prueba de medición en producción.
## 2026-10-10 — Medición del sitio dentro de integraciones (v1.6.69)

- Colocar “Medición del sitio” como opción del mismo selector que Mercado Pago, Stripe y las demás integraciones.
- Mostrar cuántos de los dos IDs, GA4 y Clarity, están configurados.
- Mantener el editor y el guardado superadmin existentes.
- Validación local: generación de Prisma Client desde el esquema y typecheck de web pasaron; git diff check pasó.

## 2026-10-10 — PHDK force recheck

PHDK standards remain v2.43.0 at upstream commit 4b4b3f29bf7d278a0a44d407f781e90d9665e3fc. Rechecked all 33 manifest destinations against a fresh clone; all match byte-for-byte.

The repeated `PHDK upgrade force` found the root `AGENTS.md` managed block differed from canonical `PHDK_NATIVE_RULES.md`; replaced only that marked block. The only previously dirty PHDK-owned content overwritten in this run was that block. Owner instructions outside the markers were preserved byte-for-byte.

Verification: canonical managed block exact; all 33 manifest files exact; `git diff --check` passed. No product files or other non-PHDK files were changed by the force replacement. No files removed. No commit, push, merge, tag, or deployment.

## 2026-10-10 — PHDK standards release v1.6.67

Canonical PHDK v2.43.0 is synchronized from upstream commit 4b4b3f29bf7d278a0a44d407f781e90d9665e3fc across all 33 manifest files, including the root AGENTS.md managed block. Product version metadata is v1.6.67; v1.6.66 was already used by an existing commit and was not reused.

This release contains standards and version metadata only; application source is unchanged. Verification: all 33 vendored files match upstream, the native managed block matches PHDK_NATIVE_RULES.md, and git diff --check passes.

# STATUS — Coffee Bunn Café Platform

## 2026-10-16 — Medición de cotizaciones con GTM (v1.6.74)

- Emitir el evento `cbc_quote_submitted` sólo tras confirmar la cotización y aceptar analítica; medirlo en GA4 y en Google Ads mediante GTM, sin datos personales.
- GTM versión 5 está publicada y la acción de conversión de Google Ads está creada.
- La campaña de prueba quedó configurada con presupuesto total de MXN 200 por tres días; Google Ads bloquea su publicación porque la cuenta está cancelada. No se reactivó la cuenta ni se generó gasto.
- Typecheck de web, build de producción y `git diff --check` pasaron; no se ejecutaron pruebas automatizadas ni verificación en el sitio en vivo.
- Entrega del cambio web por la rama y PR habitual pendiente.

## 2026-10-10 — PHDK standards upgrade

PHDK standards: v2.31.1 → v2.43.0
Upstream: https://github.com/tuyoisaza/PHDK
Upstream commit: 4b4b3f29bf7d278a0a44d407f781e90d9665e3fc
Date: 2026-10-10
Manifest: 33 mapped files; 10 added destinations and no removed prior destinations.
Product version metadata: v1.6.65 (unchanged; this sync did not authorize a commit).

Force-synchronized every manifest mapping and refreshed the marked PHDK block in root
`AGENTS.md`. The owner instructions outside the managed block remain intact, including
the prohibition on delegation and the requirement for current-request Git authorization.
The newer managed block describes a PHDK PMO delegation exception; the stricter owner
rule outside that block continues to govern this repository. No product source changed.

Verification: every mapped destination matches its fresh upstream source byte-for-byte;
the root managed block was later found to differ from canonical PHDK_NATIVE_RULES.md and corrected in the force recheck above; owner text outside its markers is preserved;
the working tree was clean before synchronization. No files were removed, and no commit,
push, merge, tag, deployment, browser session, live probe, or external setting change was
made. The sync is available for review on `chore/phdk-upgrade-v2.43.0`.

## 2026-10-04 — PHDK standards maintenance

PHDK standards: pre-versioned PHDK kit (no vendored standards) → v2.31.1
Upstream: https://github.com/tuyoisaza/PHDK
Upstream commit: a5f45b5d727c40eb2897f0eaf4fbe6fc310417e9
Date: 2026-10-04
Product version metadata at synchronization: v1.6.65.

Synchronized the 23 manifest mappings and the applicable native PHDK rules. The active
rules now require interactive work on the current request, with no autopilot, delegation,
background work, GitHub Actions, or scheduled execution. Existing stricter owner controls
and product/stack decisions remain in force.

Verification: all 23 vendored files match the pinned upstream sources byte-for-byte;
native managed blocks match the canonical block; source/diff and path review completed.
No application build, browser test, live-service probe, or deployment was used to verify
this documentation maintenance. Conflicts: none in the inspected committed snapshot.
The existing task file and product backlog remain unchanged and inactive; this sync does
not resume earlier implementation work or establish production behavior.

## Current Version
v1.6.73

## Completed Slices
- Carrusel sutil de imágenes B2B: miniaturas automáticas de 88 × 66 px, sin textos ni botones, con soporte de movimiento reducido (v1.6.73).
- Carrusel deslizable de imágenes del catálogo B2B con enlaces al catálogo completo, en portadas ES/EN (v1.6.72).
- Renderizar el bootstrap de GA4 desde la configuración superadmin en el HTML inicial; iniciar consentimiento antes de hidratación y excluir rutas privadas (v1.6.71).
- Advanced consent mode for GA4 with cookieless public page views while analytics storage is denied; Microsoft Clarity remains opt-in (v1.6.70).
- Consent-based Google Analytics 4 and Microsoft Clarity, with superadmin-managed IDs, privacy controls, and audit logging (v1.6.68).
- Synchronize PHDK standards v2.43.0 and refresh the managed agent block (v1.6.67).
- B2B Box prices now use the linked retail product price, matching the home page; volume discounts are calculated and displayed separately in the quote (v1.6.65).
- Simplify the B2B catalog hero description by removing the purchase-mode callout (v1.6.64).
- The public footer no longer exposes the internal Admin Portal link; the `/login` route remains available for authorized staff (v1.6.63).
- Public footer now links to Spanish and English privacy-policy and terms-and-conditions pages. The Spanish pages describe quote/order, payment, personalization and data-handling practices (v1.6.62).
- Standalone B2B catalog with distinct quote navigation, method/kit and extra detail pages, multi-photo extra editing, long descriptions and explicit piece/package presentations. Extras-only quotes share server-side validation and pricing with kit quotes and retain presentation in saved orders (v1.6.60). See `docs/deploy/b2b-extra-catalog.md`; release gated on full tests, TypeScript, production build and isolated browser/database smoke checks.
- Product galleries detect YouTube and Instagram links, embed supported videos, and provide a direct new-tab fallback for restricted or unsupported embeds (v1.6.59).
- Add a matching Italian moka homepage kit image using the French-press Domo box, elevated angle, red bow and a visible customizable postcard (v1.6.58).
- Refine the French press kit homepage image from the team's supplied post: isolate and center the kit, remove surrounding post copy and enlarge the branded customizable postcard (v1.6.57).
- Homepage-ready conceptual French press gift-kit image using the approved press model, Nayarit bag label, Coffee Bunn Café logo and oversized customizable postcard mockup (v1.6.56).
- B2B quotes restrict delivery to CDMX or pickup, apply free CDMX shipping at 15 kits, enforce 15-day standard / 5-day rush delivery and rush-extra rules, and recalculate all saved amounts on the server; add a B2B catalog preview and audited soft deletion for read customer-service messages (v1.6.55).
- Payment email failures distinguish missing provider setup, unreadable configuration and provider rejection, with a direct configuration link (v1.6.54). Production diagnosis: Brevo key missing; user selected Brevo and must save its key and verified sender in Configuration.
- Order payment links can be copied or emailed to the saved customer address, with delivery feedback and audited sends (v1.6.53).
- Lead details show saved quotation products, quantities, extras, prices, delivery and totals prominently; distinguish viewing saved quotes from starting a new quote (v1.6.52).
- Revenue uses collected MXN payments, monthly payment dates and complete historical totals; reversible test/not-completed exclusions available in orders and lead details, independent of archival (v1.6.51). Verified 209 suite tests plus 13 classification API/UI tests and TypeScript checks.
- Digital coffee scale catalog image with timer, dark background and warm lighting (v1.6.50).
- Extras use their entered cost plus the configured wholesale markup, then IVA; quote displays and saved extra lines include the margin and free extras remain zero (v1.6.49).
- Japanese siphon, standalone butane burner and four-panel white-ink personalization samples (v1.6.48).
- French press sample corrected to match supplied kit reference: black plastic band, open cage and low base (v1.6.47).
- Free extras: admin Gratis checkbox, zero-price creation/editing, and clear quote labels without added cost (v1.6.46). Verified with 203 tests and TypeScript checks.
- Revised plastic French press, Kyoto, V60 and Chemex catalog references; client-logo box and card variants (v1.6.45).
- Six AI-generated catalog samples for methods and extras, with prompts and conceptual-use notes (v1.6.44); stored in assets/catalog-samples, not uploaded to admin.
- Google Places address autocomplete in the retail checkout (v1.6.39/1.6.40)
- Marketing automation removal (all social posting, content engine, approval loop, marketing admin UI, Post model)
- PHDK adoption: process standardization (ARCHITECTURE_DECISIONS.md, TASK.md, STATUS.md, CHANGELOG.md, health endpoints conforming to PHDK, version display, .env.example cleanup)
- Admin platforms expansion (audit, roles, users, system, debug modules + ACL)
- Shared packages (types, validators, observability)
- i18n (LanguageSwitcher + lib/i18n.ts)
- Test infrastructure (vitest suite)
- Debug mode system (DebugPanel, /admin/debug, copy/download diagnostics)
- /api/health/deep endpoint
- All-in pricing (shared lib/pricing.ts + single-checkout final-price + descriptive errors)

## Current Slice
Spanish and English homepage teasers show only small B2B catalog images in an automatic, seamless carousel. Every image opens the matching full catalog. The carousel pauses on hover or keyboard focus and becomes manually scrollable when reduced motion is enabled.

Verification: Prisma Client generation, `pnpm --filter @cbc/web typecheck`, `pnpm --filter @cbc/web build`, and `git diff --check` passed. No browser or live-site check was run.


## Inactive Context — Previously Current Slice
Secure provider configuration: `/admin/configuration` for explicit superadmins, including nine providers, AES-256-GCM database storage, write-only secret management, server-side environment import, transactional audit, fresh authorization, and dynamic integration clients. Activation guide: `docs/deploy/integration-configuration.md`.

Mercado Pago integration: retail checkout and B2B deposits/balances implemented locally, with signed Webhooks, payment verification, retry handling, and admin payment actions. See `docs/deploy/mercadopago.md`.

- Automated regression coverage includes secure provider storage, authorization, payment processing, and login destination preservation.
- Railway seller token connectivity checked successfully (HTTP 200); webhook signing secret was absent during inspection.
- Production preparation completed: additive schema applied and matched against Prisma, independent encryption key configured, both authorized owners granted superadmin, and 10 existing provider fields imported into encrypted storage.
- Release v1.6.41 removes automatic reseeding and accepted data loss from startup. Existing prices, settings and roles are preserved on restart.
- Remaining payment activation: configure the Mercado Pago webhook secret through Configuración and complete a provider checkout/payment-notification test. No live charge performed.

## Next Slices / Candidates
- Feature structure reorganization (move to src/features/<name>/) — not started
- /admin/ai route — not started
- Shared `ui` package — not started
- Verify Railway GitHub integration (deploy.yml removed; confirm builds from the GitHub repo pick up)
- Environment validation: fail the build instead of logging-and-continuing

## Blocked Slices
None

## Gaps
- No feature structure under src/features/
- No /admin/ai route
- No shared `ui` package
- Deploy removed but Railway GitHub integration not yet verified end-to-end
- Environment validation logs an error but does not fail the build
- Data backup policy documented but restore not tested
- No LSP setup verification

## Open Questions
- Move to src/features/ now, or keep current structure until a feature genuinely needs it?
- Is /admin/ai needed (an AI assistant UI for admin)? If so, which provider/model?
- Should environment validation fail the build (strict) or keep non-fatal logging?
