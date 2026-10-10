# Changelog

All notable changes to the CBC platform will be documented in this file.

The format is based on [PHDK VERSIONING.md](https://github.com/tuyoisaza/PHDK/blob/main/VERSIONING.md).

---

## v1.6.69 — Group site measurement with integrations

- Add “Medición del sitio” to the same superadmin integration selector as Mercado Pago and Stripe.
- Show the configured count for the GA4 and Clarity IDs, refreshed after loading or saving.

### Verification
- TypeScript validation and git diff check passed.
- No browser session, live endpoint, provider dashboard, or deployment was used.

## v1.6.68 — Consent-based website analytics

- Add Google Analytics 4 and Microsoft Clarity with a persistent visitor consent choice; scripts load only after consent.
- Add superadmin configuration for the GA4 Measurement ID and Clarity Project ID, with protected validation and audit logging.
- Exclude private/admin paths, remove query parameters from Google page views, mask contact and quote form content using Clarity's element masking attribute, and update privacy notices and Content Security Policy.
- Keep provider IDs out of environment variables and source. The supplied IDs must be entered by a superadmin after the UI is available.

### Verification
- `pnpm --filter @cbc/web typecheck` passed.
- Superadmin analytics route tests passed (8/8); i18n tests passed (6/6).
- `git diff --check` passed. Lint stopped at Next.js's first-run configuration prompt; no ESLint configuration was created. Prettier is not installed, so its check could not run.
- A production build was not run because build-time database access is prohibited in this task. No browser, database, live endpoint, provider dashboard, or deployment was used.

## v1.6.67 — PHDK standards v2.43.0

- Synchronize the vendored PHDK standards and managed agent rules with canonical upstream v2.43.0.
- Keep the product version metadata aligned with the standards release.

### Verification
- All 33 vendored files match canonical upstream; the root managed block matches `PHDK_NATIVE_RULES.md`.
- `git diff --check` passed. Application source is unchanged.

## v1.6.65 — Align B2B box pricing

- Use each linked Box product's retail base price in the B2B catalog and quote calculation instead of the method cost.
- Apply the configured retail markup consistently, then show volume discounts as a separate quote deduction.
- Remove wholesale-price copy that implied a different starting price.

### Verification
- 314 automated tests, TypeScript validation, and production build completed locally.
- Visual/runtime behavior was not exercised; it requires deployment and is outside the local verification scope.

## v1.6.64 — Simplify B2B catalog copy

- Remove the purchase-mode callout from the B2B catalog hero in Spanish and English.

### Verification
- TypeScript validation and production build completed locally.
- Visual/runtime behavior was not exercised; it requires deployment and is outside the local verification scope.

## v1.6.63 — Hide public admin link

- Remove the internal Admin Portal link from the public footer while preserving the `/login` route for staff.

### Verification
- TypeScript validation and production build completed locally.
- Visual/runtime behavior was not exercised; it requires deployment and is outside the local verification scope.

## v1.6.62 — Privacy policy and terms

- Add public, responsive Spanish and English privacy-policy and terms-and-conditions pages.
- Add persistent footer links on every public page, with localized labels.
- Include clear treatment of quote/order data, payments, personalization, delivery, ARCO requests and contact information.

### Verification
- TypeScript validation and production build completed locally.
- Visual/runtime behavior was not exercised; it requires deployment and is outside the local verification scope.

## v1.6.61 — 2026-10-04

### Changed
- Synchronize the existing PHDK integration to v2.31.1 from canonical upstream `a5f45b5d727c40eb2897f0eaf4fbe6fc310417e9` using its 23-file manifest.
- Refresh active assistant rules for interactive, current-request execution and preserve stricter owner controls and product/stack decisions.
- Retire earlier standing git/delegation permissions; retain the project's version-metadata requirements for authorized commits.

### Verification
- Vendored mappings and native managed blocks match upstream byte-for-byte; source/diff and path review completed.
- Product code, dependencies, and existing workflow/deployment configuration are unchanged. No application build, browser test, or live-service check was run for this maintenance.

## v1.6.60 — B2B catalog and standalone extras

- Separate Catálogo B2B from Cotizar, with searchable ES/EN catalog routes and full detail pages for existing methods/kits and extras.
- Expand extra administration with multiple photos, cover ordering, long descriptions, visibility, standalone eligibility, rush eligibility, sale-unit labels, package contents and minimum quantities.
- Allow extras-only and mixed quotes using one authoritative calculation service. Preserve kit-only volume discounts/free-shipping eligibility; calculate standalone shipping and rush fees without treating package contents as kit counts.
- Snapshot piece/package presentation in quote lines and show extras in saved order details and sale-unit counts. Preserve legacy images, IDs, costs, quote history and current kit links.
- Add schema migration, calculator/data/API/UI regression coverage, and an isolated PostgreSQL/browser smoke test. Release checks run the full test suite, TypeScript and production build before publishing.

## v1.6.59 — YouTube and Instagram product videos

- Detect standard YouTube watch, short, live and embed links plus Instagram posts, Reels and TV posts; load the matching player in the product gallery.
- Keep a direct open-in-new-tab link beside every embedded video, and open unsupported video providers in a new tab.
- Use the product image as the Instagram video thumbnail, allow Instagram frames through the site CSP and clarify video-link support in product administration.
- Verification: URL parser and gallery fallback regressions, TypeScript, full test suite and production build.

## v1.6.58 — Italian moka kit homepage image

- Add a homepage-ready moka gift kit image matching the French-press companion: horizontal transparent Domo box, elevated view, kraft base, crinkle paper and red bow.
- Keep the moka and Puebla coffee pouch visible, with an enlarged brand-color postcard reading «Tu logo aquí» and «Tu mensaje aquí».
- Document the generated image as conceptual product artwork, not verified inventory photography.

## v1.6.57 — Isolated French press kit homepage image

- Refine the French press product image directly from the supplied approved post, removing its surrounding logo and promotional copy.
- Enlarge the single landscape postcard, position it in the foreground, and use the brand yellow, charcoal and cream with «Tu logo aquí» and «Tu mensaje aquí» placeholders.
- Keep the existing kit composition and both products recognizable in a homepage-ready 16:9 image.

## v1.6.56 — French press gift kit homepage image

- Add a horizontal conceptual product image for the French press gift kit, following the approved campaign kit, Nayarit bag label, official logo and Domo box references.
- Show one large customizable postcard mockup with brand colors and an illustrative recipe-video QR; keep the moka image out of this iteration while the press kit is reviewed.
- Clarify that the generated image and QR are illustrative and must be verified before live product use.

## v1.6.55 — B2B fulfillment rules, quote security and catalog preview

- Restrict B2B shipping to CDMX / Área Metropolitana and pickup; enforce free CDMX shipping from 15 kits and reject inactive or unsupported zones.
- Recalculate methods, extras, volume discounts, shipping, rush fee, IVA, total and deposit from server catalog/configuration data before saving.
- Enforce standard delivery from 15 days and rush delivery from 5 days; block rush-disallowed extras and remove them from the selected set when urgency is enabled.
- Add structured rush eligibility for extras and correct Tapografía to Tampografía; preserve existing interior-zone records as inactive.
- Add a product-led B2B catalog preview with images, kit details, methods, extras and preselected quote entry.
- Add audited soft deletion for read/replied inbound service messages.
- Verification: 267 full-suite tests passed (with 1 updated wizard test), TypeScript and production build passed.

## v1.6.54 — Actionable payment email configuration errors

- Distinguish missing email provider configuration from secure configuration errors and delivery-provider failures without exposing credentials or raw provider responses.
- Link payment email failures to provider configuration; preserve the existing boolean email API for other callers.
- Diagnose the reported production failure as missing usable email credentials; activation requires saving the user's Brevo key and verified sender.
- Verification: full test suite and focused email regressions passed; no real customer messages sent during diagnosis or tests.

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
