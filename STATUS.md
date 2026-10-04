# STATUS — Coffee Bunn Café Platform

## 2026-10-04 — PHDK standards maintenance

PHDK standards: pre-versioned PHDK kit (no vendored standards) → v2.31.1
Upstream: https://github.com/tuyoisaza/PHDK
Upstream commit: a5f45b5d727c40eb2897f0eaf4fbe6fc310417e9
Date: 2026-10-04
Product version metadata: v1.6.61.

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
v1.6.61 (PHDK maintenance version; release tag not created by this sync)

## Completed Slices
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
