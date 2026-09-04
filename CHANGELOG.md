# Changelog

All notable changes to the CBC platform will be documented in this file.

The format is based on [PHDK VERSIONING.md](https://github.com/tuyoisaza/PHDK/blob/main/VERSIONING.md).

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
