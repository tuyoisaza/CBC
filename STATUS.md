# STATUS — Coffee Bunn Café Platform

## Current Version
v1.6.42 (tag `v1.6.42` — see `git describe --tags --abbrev=0`)

## Completed Slices
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
