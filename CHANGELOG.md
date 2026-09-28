# Changelog

All notable changes to the CBC platform will be documented in this file.

The format is based on [PHDK VERSIONING.md](https://github.com/tuyoisaza/PHDK/blob/main/VERSIONING.md).

---

## v1.6.53 — Copy and email payment links

- Add Copiar and Enviar por correo beside each payable order link, showing the saved recipient and copy/send feedback.
- Send a quotation thank-you email with payment reference, amount and existing payment URL; validate recipient and payment state server-side and audit successful sends.
- Keep provider failures visible and prevent repeated clicks while sending; email actions do not generate another payment or send WhatsApp messages.
- Verification: 251 full-suite tests plus two additional legacy cancellation regressions passed; TypeScript and production build verified. Email providers mocked during tests; no customer email sent for validation.

## v1.6.52 — Saved quotation details in leads

- Show the customer's saved quotation at the top of each lead: products, quantities, unit prices, extras, delivery information and full financial breakdown.
- Preserve saved prices and support historical item formats without recalculating against the current catalog.
- Separate Ver cotizaciones guardadas from Nueva cotización; keep payment and order actions beside the saved quotation.
- Verification: production build and TypeScript checks passed; 226 full-suite tests plus the additional internal-upload-link regression passed.

## v1.6.51 — Real collected revenue and sale exclusions

- Count paid MXN payment amounts instead of quoted totals, including partial deposits; use payment dates for monthly revenue and all records for historical totals.
- Exclude cancelled orders and add reversible Prueba / Venta no concretada classifications in order lists, order details and lead quotations. Preserve history and audit classification changes without customer notifications.
- Keep lead archival independent from revenue and explain this in the admin. Count customers and average collections only for eligible paid orders.
- Add nullable Order.revenueExclusionReason with an additive migration; Railway startup schema synchronization applies it.
- Verification: 209 full-suite tests plus 13 classification API/UI tests passed; TypeScript checks passed.

## v1.6.50 — Digital coffee scale sample

- Add a standalone digital coffee scale image and its generation prompt.
- Verification: visual review of product, display and catalog style; no application logic or production catalog changes.

## v1.6.49 — Apply wholesale margin to extras

- Treat admin extra prices as costs and apply the configured wholesale markup before IVA in quote calculations.
- Match extra selection, summary and saved extra line prices to the margin; zero-cost extras remain free.
- Clarify cost and margin labels in admin; load pricing settings in the English quote page as well.
- Verification: full 204-test suite plus the new wizard pricing regression passed; TypeScript checks passed. Tests cover markup before IVA, saved extra line prices, quantities and free extras.

## v1.6.48 — Siphon and personalization samples

- Add a Japanese siphon reference and a separate refillable metallic butane burner extra.
- Add a four-panel close-up showing white TU LOGO AQUÍ prints on French press, siphon, Chemex and black V60.
- Record prompts and illustrative product limitations; visually reviewed all three PNGs. No production catalog changes.

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
