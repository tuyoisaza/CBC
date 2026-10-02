# B2B catalog — v1.6.60

## Customer flow

- `/catalogo-b2b` is a browsable catalog, distinct from `/cotizar`. English equivalents live under `/en`.
- Catalog cards link to `/catalogo-b2b/{extra|method}/{slug-or-id}` with a full description, gallery, presentation, minimum quantity and reference wholesale price including IVA.
- `Cotizar este producto` passes the existing catalog ID and the requested sale-unit quantity into the quote wizard. Existing `?product=<kit-slug>` links remain supported.
- An order can contain methods/kits, extras only, or both. There is no forced kit purchase for a standalone extra.
- Existing methods retain their identity and prices. A method linked to a kit is labeled as that kit, not falsely advertised as a bare brewing device. A standalone physical item can also be managed in Extras without duplicating an existing SKU.

## Data and administration

Extend `Extra`; do not duplicate it into Product. Existing IDs, costs, active flags, rush flags and quote history remain unchanged. Descriptions now have a 20,000-character editor, with a separate 320-character summary. Support up to 12 JPG/PNG photos, upload, reorder, cover selection and removal from the gallery. Removing a gallery reference does not delete a file that may be used elsewhere.

New fields: nullable unique `slug`, `shortDescription`, `images`, `catalogVisible`, `sellableStandalone`, `unitLabel`, `unitsPerPack`, `minQty`. Newly added defaults make existing active extras visible and independently quotable, sold as one piece with a minimum of one. The administrator can explicitly disable standalone quoting for a kit-only service. No product content, pricing, stock or packaging claims are invented during deployment.

The legacy `imageUrl` is retained. The catalog falls back to it automatically; saving a gallery synchronizes `imageUrl` to its first photo, so current quote emails continue to work. No destructive backfill or reseed is needed.

`unitPrice` remains an internal cost in the admin, per sale unit. The new public catalog returns a calculated selling price, not that cost. `active` is availability for quoting, not a claim of physical stock.

## Quantities and calculations

50 packages of 100 filters means `qty=50`, `unitLabel=paquete`, `unitsPerPack=100`. Price and quantity are per package; physical contents total 5,000. Presentation is snapshotted into `Quote.extraItems`, so later catalog edits do not rewrite old quotes.

Both calculation and submission use `calculateQuoteForSave`; submitted prices, totals, names and package contents are ignored. The server checks active IDs, minima, duplicate lines, nonempty orders, allowable zones, dates and rush restrictions.

No new quantity-discount policy for accessories is invented: existing volume discounts still apply to method/kit lines only. Extras use configured wholesale markup and IVA. The free-shipping threshold remains 15 kits, not 15 accessories or 15 packages. Mixed orders preserve the current kit shipping calculation. Extras-only delivery uses the zone's existing base fee plus per-sale-unit fee; pickup uses the configured pickup rate. Rush fees on an extras-only quote apply to the extras total so the order cannot bypass the configured rush surcharge through an empty kit subtotal.

Quotes, customer emails, order details and quantities retain standalone extras. Existing B2B payment links continue to charge the persisted quote total/advance rather than relying on kit count. No live payment or production data write is part of validation. This release does not alter fiscal product classification or add a stock-management system.

## Deployment and verification

The schema change is additive. Railway's existing start command uses `prisma db push`; it applies the new columns and defaults without `--accept-data-loss`. A matching SQL migration is included for migration-based environments. Do not run the seed against production.

Release checks: Prisma generation, full Vitest regression suite, TypeScript, production Next build, and a smoke test against an isolated local PostgreSQL database. The smoke test refuses to run unless `CBC_CATALOG_SMOKE=1` and DATABASE_URL targets a local database named `cbc_test`.

Rollback the application only after considering newly created extra-only quotes. Do not drop the added columns or delete new quote records to roll back the UI.

### Safe deployment with existing extras

Railway and Nixpacks run `prepare-extra-catalog.cjs` before `prisma db push`. It applies only the additive catalog columns and unique nullable slug index in a transaction. It is idempotent, skips a fresh database, preserves legacy content, and fails rather than ignoring duplicate slugs. No `--accept-data-loss`, reset or production seed is used.
