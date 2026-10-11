# TASK — Simplify the B2B homepage image teaser

## Authorization and scope
Current request: Make the homepage B2B teaser more subtle by removing visible headings, item names, and catalog buttons; reduce image cards to about one quarter of their previous size; and make the images scroll automatically.

In scope: the shared Spanish/English B2B teaser component, its carousel styling, and release metadata for this change.
Out of scope: catalog content or destinations, Analytics/Clarity configuration, admin integrations, provider settings, direct deployment, and release tags.
Delivery target: remote `main` through the normal feature branch and pull request flow, per the current owner instructions.

## Acceptance
- [x] Show only small catalog images; each image still opens the corresponding full catalog.
- [x] Remove the visible heading, item names, arrows, per-item text, and final catalog button.
- [x] Automatically loop the image strip in Spanish and English.
- [x] Pause on hover/focus and honor the reduced-motion preference.
- [x] Complete local TypeScript, production build, and diff checks.

## Verification
Prisma Client generation, `pnpm --filter @cbc/web typecheck`, `pnpm --filter @cbc/web build`, and `git diff --check` passed. No browser or live-site check was run.
