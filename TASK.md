# TASK — Correct GA4 measurement with advanced consent

## Authorization and scope
Current request: Inspect the Google Analytics web stream and correct CBC collection after the owner selected Advanced Consent Mode, which sends limited signals without analytics cookies before acceptance.
Observed in the owner’s Analytics session: the web stream Measurement ID is `G-WWLTLPBZ8Q`, matching CBC; Analytics reports no received data in the last 48 hours. The stream URL is `http://coffeebunncafe.com` although the public domain is HTTPS.
Status: Implementation and local checks are complete for v1.6.70. Delivery target: remote `main` through a reviewable pull request.
Execution mode: interactive-only, single assistant, no delegation.
Goal: Ensure GA4 receives query-free public page views while storage is denied, then respect the visitor choice; load Clarity only after acceptance.

Done when:
- [x] GA4 loads on public pages with analytics/ad storage denied by default and sends pathname-only page views without query parameters.
- [x] Acceptance grants analytics storage; rejection keeps it denied. Existing v1 choices are not silently reused after this behavior change.
- [x] Clarity remains gated on acceptance and continues receiving explicit consent updates.
- [x] Spanish and English banner, admin instructions, and privacy policies disclose cookieless GA4 signals before choice.
- [x] Excluded routes, Clarity form masking, and existing superadmin-managed IDs remain intact.
- [x] Prisma Client generation, web typecheck, diff check, version metadata, and source/diff review are complete.

In scope: GA4 consent initialization and page views, consent version key, clear visitor-facing copy, and release metadata needed for this fix.
Out of scope: editing Google Analytics or Clarity dashboard settings, changing the GA stream URL, provider credentials, hosting settings, direct deployment, or release tags.
Owner approval: the owner chose Advanced Consent Mode after being told it sends cookieless signals before acceptance. Follow the existing branch/PR controls for this privacy behavior change.

## Implementation and verification
- Source: GA4 initializes with default denied on public routes and sends sanitized pathname-only page views before choice; Clarity loads only after grant. Consent storage key is v2 so users see the revised disclosure.
- Copy: Spanish and English disclosure now explains cookieless GA4 signals and the Clarity gate; privacy pages and admin description were updated.
- Verification: Prisma Client generation, web typecheck, and `git diff --check` passed. No tests, lint, production build, browser-based code test, or live-site probe were run.
- Provider diagnosis: the Analytics stream ID matches; its URL is HTTP and Google reports no data in the last 48 hours. This diagnosis is separate from local code verification.

## Delivery
- Delivery target: merge v1.6.70 from `codex/ga4-advanced-consent` into remote `main` through the normal review path for this privacy behavior change.
- No tag or provider/dashboard setting write is authorized by this task.
- Report remote `main` and deployment evidence separately; a code merge does not itself prove production collection.
