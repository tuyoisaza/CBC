# TASK — Configure opt-in website analytics

## Authorization and scope
Current request: Add Google Analytics 4 and Microsoft Clarity to the CBC public site, then let superadmins enter their IDs in the admin panel instead of build environment variables.
Status: Source implementation and local verification complete; commit, push, pull request, and merge are authorized for this change; provider activation remains pending.
Execution mode: interactive-only, single assistant, no delegation.
Goal: Measure public-site visits and interactions after visitor consent, with admin-managed provider IDs.
Done when:
- [x] Google Analytics 4 and Clarity load only after visitor consent and support reject/change choices.
- [x] Admin, sign-in, health, API, and order-tracking paths are excluded; Google page views omit query parameters.
- [x] Contact and quote form content is marked for Clarity masking; privacy notices and CSP are updated.
- [x] Superadmins can enter, update, and clear the two IDs in `/admin/configuration`; no environment IDs are required.
- [x] Applicable local checks and risk-triggered tests are complete, with unavailable checks documented accurately.
In scope: opt-in browser measurement, superadmin configuration UI and protected API, the public two-ID projection, validation/audit, privacy/CSP/code tracking updates.
Out of scope: Creating or configuring provider accounts, changing provider dashboards or deployment settings, directly operating production, or creating/pushing a release tag. A commit, branch push, pull request, and merge for this analytics change are authorized by the current request only.
Owner stop/pause controls: No additional pause instruction applies to this analytics request; repository work remains interactive-only.
Git actions authorized now: create `feature/website-analytics`, commit with required version metadata, push the branch, create a pull request, and merge that pull request if existing repository protections permit it.
Branch: `feature/website-analytics`.

## Implementation and verification
- Consent UI and route/privacy safeguards: implemented; provider scripts load only after consent and the public page-view data omits query parameters.
- Superadmin ID entry, strict server validation, transactional audit, and limited public projection: implemented without a database schema migration or environment IDs.
- Verification: `pnpm --filter @cbc/web typecheck` passed; targeted superadmin route tests passed (8/8); i18n tests passed (6/6); `git diff --check` passed. `pnpm --filter @cbc/web lint` could not run because `next lint` opened its first-run ESLint setup prompt; no ESLint configuration was created. The Prettier check could not run because Prettier is not installed. A Next.js build was not run because server pages query the database and this scope prohibits database connections. No browser, live service, database, provider dashboard, or deployment operation was used.
- Git hook inspection found only Git's sample hooks in `.git/hooks`; no active `commit-msg`, `pre-commit`, or `pre-push` hook was installed in this checkout.

## Current delivery
- The two IDs supplied for this feature are `G-WWLTLPBZ8Q` (GA4) and `yvn1wwnadb` (Clarity). They are intentionally not stored in source or environment variables; a superadmin must enter them after the configuration UI is available.
- No release tag is authorized. Publication is limited to the requested branch/PR/merge flow, and an actual production deployment must not be claimed without evidence.
- The user's request to publish every future change does not override this repository's requirement for authorization in each current request.

## Inactive follow-up context
After this code is deployed through the owner's separately authorized release process, a superadmin can enter the GA4 Measurement ID and Clarity Project ID in `/admin/configuration`. Separately, disable Enhanced Measurement in the GA4 web stream and turn off Clarity's default cookie setting in Settings → Setup. No provider or deployment settings are operated by this task.
