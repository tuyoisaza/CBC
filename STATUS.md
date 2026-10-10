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
v1.6.68

## Completed Slices
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
Opt-in website analytics: Google Analytics 4 and Microsoft Clarity load only after visitor consent. The persistent preference control allows visitors to accept, reject, or change their choice. Admin, sign-in, health, API, and order-tracking paths are excluded. Google page views omit query parameters; contact and quote form content is marked for Clarity masking.

Superadmins configure, update, or clear the GA4 Measurement ID and Clarity Project ID at `/admin/configuration`. The values are public IDs stored in the existing settings table; the protected write validates and audits changes, and a no-cache public endpoint projects only these two IDs. No environment variables or schema migration are needed. The supplied IDs (`G-WWLTLPBZ8Q` and `yvn1wwnadb`) have not been entered; they remain to be saved by a superadmin after the UI is available.

Provider activation still requires entering the IDs after code delivery, disabling Enhanced Measurement in the GA4 web stream (to prevent duplicate or unsanitized automatic events), and turning off Clarity's default cookie setting in Settings → Setup so it waits for consent. No provider or deployment settings were operated. Product version metadata is v1.6.68. The current request authorizes a versioned commit, branch push, pull request, and merge if existing repository protections permit it; no release tag is authorized and production deployment is not verified.

Verification: `pnpm --filter @cbc/web typecheck` passed; targeted superadmin configuration tests passed (8/8); i18n tests passed (6/6); `git diff --check` passed. `pnpm --filter @cbc/web lint` reached Next.js's first-run ESLint configuration prompt and exited without creating configuration. Prettier is not installed, so its check could not run. A Next.js build was not run because server pages query the database and this scope prohibits database connections. No browser, live endpoint, database, provider dashboard, or deployment was used.

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
