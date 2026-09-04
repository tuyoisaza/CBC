# STATUS — Coffee Bunn Café Platform

## Current Version
v1.6.40 (tag `v1.6.40` — see `git describe --tags --abbrev=0`)

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
None in flight — working tree contains the v1.6.40 release bump, ready to push to main.

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
