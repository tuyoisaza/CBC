# TASK — PHDK Adoption: Process Standardization

## Slice
User-visible outcome: CBC project has PHDK tracking files, architecture decisions documented, and health endpoints conforming to PHDK format
In scope: ARCHITECTURE_DECISIONS.md, TASK.md, STATUS.md, CHANGELOG.md, health endpoint fixes, version display, .env.example cleanup
Out of scope: Debug mode system, i18n implementation, feature structure reorganization, shared packages creation, deploy workflow removal
Depends on: None

## Tasks
- [x] Create ARCHITECTURE_DECISIONS.md documenting all stack deviations
  - ID: phdk-001
  - Files: ARCHITECTURE_DECISIONS.md
  - Acceptance: File exists with all deviations documented
  - Blocked by: none
- [x] Create TASK.md for current slice
  - ID: phdk-002
  - Files: TASK.md
  - Acceptance: File exists with proper PHDK TASK.md format
  - Blocked by: none
- [x] Create STATUS.md with project status
  - ID: phdk-003
  - Files: STATUS.md
  - Acceptance: File exists with completed/current/next slices
  - Blocked by: none
- [x] Create CHANGELOG.md starting from current version
  - ID: phdk-004
  - Files: CHANGELOG.md
  - Acceptance: File exists with proper PHDK changelog format
  - Blocked by: none
- [x] Remove residual marketing code from /health endpoint
  - ID: phdk-005
  - Files: apps/web/src/app/health/route.ts
  - Acceptance: No 'engine' or 'linkedin' entries in ENV_GROUPS
  - Blocked by: none
  - Verified: ENV_GROUPS has no engine/linkedin entries
- [x] Update /api/health to PHDK format
  - ID: phdk-006
  - Files: apps/web/src/app/api/health/route.ts
  - Acceptance: Returns {status, service, version, environment}
  - Blocked by: none
  - Verified: returns status/service/version/environment
- [x] Add version display to app shell
  - ID: phdk-007
  - Files: apps/web/src/app/layout.tsx, apps/web/src/components/public/VersionBadge.tsx
  - Acceptance: Version badge visible near logo
  - Blocked by: none
  - Verified: VersionBadge renders NEXT_PUBLIC_APP_VERSION (with copy-debug on click)
- [x] Add version display to login page
  - ID: phdk-008
  - Files: apps/web/src/app/login/page.tsx
  - Acceptance: Version shown in footer area
  - Blocked by: none
  - Verified: login footer shows NEXT_PUBLIC_APP_VERSION
- [x] Add version display to admin panel
  - ID: phdk-009
  - Files: apps/web/src/app/admin/(protected)/layout.tsx, apps/web/src/components/admin/AdminNav.tsx
  - Acceptance: Version shown in admin shell
  - Blocked by: none
  - Verified: AdminNav shows version next to logo (with copy/download)
- [x] Clean up .env.example
  - ID: phdk-010
  - Files: .env.example
  - Acceptance: No sk_live_/pk_live_ prefixes
  - Blocked by: none
  - Verified: placeholders use bare var names, no live/test key prefixes
