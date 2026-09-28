# Changelog

All notable changes to the CBC platform will be documented in this file.

The format is based on [PHDK VERSIONING.md](https://github.com/tuyoisaza/PHDK/blob/main/VERSIONING.md).

---

## v1.6.47 — French press reference correction

- Match the supplied kit image with an open black plastic cage, horizontal band, low base, domed lid and left handle.
- Preserve the previous sample and record the new preferred image and generation prompt.
- Verification: visual inspection against the user reference; no application or production catalog changes.

## v1.6.46 — Free extras

- Allow zero-priced extras in admin create and update APIs while rejecting negative prices.
- Add a Gratis checkbox to extra price inputs and show Gratis in the admin list and quote wizard.
- Store free extras as a zero unit price; no database migration required.
- Verification: 203 tests and TypeScript checks passed, including free-extra creation/editing and unchanged quote totals with multiple free units.

## v1.6.45 — Brewing methods and client personalization samples

- Add a French press with black plastic lid, handle and lower sleeve, plus Kyoto, V60 and Chemex reference images.
- Add revised box, message card and course card samples using TU LOGO AQUÍ instead of standalone brand initials.
- Preserve previous samples and document the preferred revisions and generation prompts.
- Verification: visual inspection of all seven new PNGs; no production catalog data changed.

## v1.6.44 — Catalog image samples

- Add six PNG samples: French press, moka, pad printing, box customization, message card, and QR course.
- Record generation prompts, brand references, provisional interpretation of Tapografía, and illustrative QR/branding limitations.
- Verification: visual review of all six images; each PNG is below 2.1 MB. No application logic or production catalog data changed.

## v1.6.43 — Reusable checkout details and billing validation

- Add optional browser-local checkout drafts with a 90-day expiry, restore button, and deletion control.
- Validate RFC consistently before payment and on the server; require an email for invoice requests.
- Label card payments as Stripe so buyers can identify the provider.
- Mercado Pago activation still requires its configured webhook signing secret and provider acceptance testing.
- Verification: 195 tests and TypeScript checks passed.
- Record the standing release workflow: version, commit, tag, and push after each completed requested change.

## v1.6.42 — Configuration navigation

- Keep Configuración near the top of a scrollable admin sidebar, with accessible labels on compact screens.
- Add a superadmin credential-management link from Sistema and preserve admin destinations through Google sign-in.

## v1.6.41 — Secure provider configuration and Mercado Pago integration

- Deployment startup preserves existing business settings and prices: no automatic reseeding or accepted data loss.

- Superadmin-only Configuración for nine integration providers, with write-only credentials, environment import, replacement and explicit disabling.
- Separate AES-256-GCM credential storage, independent server master key, transactional audit without secret values, and dynamic runtime reads without redeploys.
- Fresh database authorization, explicit initial superadmin bootstrap, protected legacy settings APIs, and credential-safe diagnostics.
- Additive database migration and activation/recovery guide: `docs/deploy/integration-configuration.md`. Existing production credentials imported; Mercado Pago signing-secret setup and payment acceptance testing remain pending.

- Checkout Pro for retail purchases and B2B deposits/balances, with configurable advance percentages and payment methods.
- Signed payment Webhooks, authoritative amount/currency/provider verification, atomic order/payment updates, and retryable balance creation.
- Retail retry identity, server-verified checkout results, public product access, and admin payment-link actions.
- Configuration guide: `docs/deploy/mercadopago.md`. Production activation and end-to-end provider testing are pending.
- Removed hardcoded credentials from the deployment guide; any previously used credentials must be rotated by the account owner.

---

## v1.6.40 — 2026-09-04

### Added
- Google Places address autocomplete in the retail checkout (`AddressAutocomplete`), activated via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Verification
- Version: v1.6.40
- Deployed from Railway with the Google Maps key inlined in the client bundle
- Health: `/health` returns PHDK-standard format

### Known Issues
- None

---

## v1.5.x — 2026-08-26

### Changed
- Removed marketing automation subsystem (social posting, content engine, approval loop, marketing admin UI, Post model)
- Updated AdminNav to remove Marketing navigation item
- Cleaned dashboard to focus on sales metrics (leads, orders, messages)
- Removed marketing API key entries from settings (Anthropic, OpenAI, Meta, LinkedIn for marketing — AI keys retained for customer service)
- Removed marketing-related environment variables from env.ts and .env.example
- Updated CBC.md platform description to remove marketing engine references
- Updated marketing-playbook.md to remove automated engine sections

### Added
- ARCHITECTURE_DECISIONS.md documenting all PHDK stack deviations
- TASK.md for PHDK task tracking
- STATUS.md for cross-slice status tracking
- CHANGELOG.md for version history

### Fixed
- Removed residual 'engine' and 'linkedin' entries from /health endpoint ENV_GROUPS
- Updated /api/health to return PHDK-standard format with version, service, and environment
- Added version display to app shell, login page, and admin panel
- Cleaned .env.example to remove sk_live_/pk_live_ prefixes

### Verification
- All deleted marketing files confirmed gone (13 paths verified)
- Prisma schema valid (Post model removed, no orphaned relations)
- Zero dangling imports to deleted files
- env.ts reconciled (AI keys retained for customer service llm.ts)

### Known Issues
- Deploy workflow still uses `railway up` (to be replaced with Railway GitHub integration)
- No debug mode system yet
- No i18n system (hardcoded Spanish strings)
- No test infrastructure
- Environment validation doesn't fail the build
- Data backup restore not tested
