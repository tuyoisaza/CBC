# Architecture Decisions

This file records intentional deviations from PHDK's canonical stack. Each entry explains what was chosen, why, and when.

---

## ORM: Prisma instead of Drizzle

- **Decision:** Use Prisma as the ORM
- **Date:** Project inception (pre-PHDK adoption)
- **Reason:** Prisma was chosen before PHDK standards were applied. The schema is mature, the client is type-safe, and the migration workflow is established. Migrating to Drizzle would require rewriting all database queries and is not justified given the working state.
- **PHDK Standard:** Drizzle with PostgreSQL only
- **Override:** Prisma with PostgreSQL (PostgreSQL requirement still met)

## Auth: next-auth instead of Custom Google OAuth 2.0

- **Decision:** Use next-auth with Google provider
- **Date:** Project inception
- **Reason:** next-auth provides a well-maintained, battle-tested Google OAuth integration with session management, CSRF protection, and callback handling. Building a custom Google OAuth 2.0 implementation would add maintenance burden without proportional benefit for this project's scope.
- **PHDK Standard:** Custom Google OAuth 2.0 — no paid auth vendor
- **Override:** next-auth (open-source, not a paid vendor) with Google provider

## Backend: Next.js API Routes instead of NestJS + Fastify

- **Decision:** Use Next.js API routes as the sole backend
- **Date:** Project inception
- **Reason:** CBC is a single-team project with a single deployment target. A separate NestJS backend would add deployment complexity (two Railway services, inter-service communication) without proportional benefit. Next.js API routes handle all CBC's backend needs within a single deployment.
- **PHDK Standard:** Two Railway services — `apps/web` (Next.js) + `apps/api` (NestJS + Fastify)
- **Override:** Single Railway service with Next.js API routes

## Deployment: Single Service instead of Two

- **Decision:** Deploy as a single Railway service
- **Date:** Project inception
- **Reason:** Follows from the single-backend decision. One service simplifies deployment, environment variable management, and health checks. Railway's GitHub-connected pipeline deploys on push to `main`.
- **PHDK Standard:** Two Railway services, repo root
- **Override:** Single Railway service, repo root

## Package Naming: @cbc/* instead of @repo/*

- **Decision:** Use `@cbc/web`, `@cbc/db` package names
- **Date:** Project inception
- **Reason:** Project-specific naming is clearer for a single-team project. `@repo/*` is PHDK's convention for multi-project standards; `@cbc/*` is appropriate here.
- **PHDK Standard:** `@repo/web`, `@repo/api`, etc.
- **Override:** `@cbc/web`, `@cbc/db`

---

## Stack Additions (Not in PHDK Canonical Stack)

These integrations were added because CBC's business requires them. They are documented here for traceability.

### MercadoPago

- **Purpose:** Payment processing alternative to Stripe for Mexican market
- **Added:** Pre-PHDK
- **Risk:** Metered API — usage caps and kill switch are in place via Stripe integration; MercadoPago follows the same pattern

### Resend / Brevo Email

- **Purpose:** Transactional email delivery (order confirmations, notifications)
- **Added:** Pre-PHDK
- **Risk:** Metered API — Brevo free tier (300/day), Resend as fallback

### Cloudflare R2

- **Purpose:** Object storage for uploaded files (logos, invoices, CFDI XMLs)
- **Added:** Pre-PHDK
- **Risk:** Metered API — usage is bounded by upload volume, which is admin-controlled

### Facturapi / CFDI

- **Purpose:** Mexican tax invoice (CFDI) generation via Facturapi
- **Added:** Pre-PHDK
- **Risk:** Metered API — each CFDI is a billable operation; usage is bounded by order volume

### PostHog Analytics

- **Purpose:** Product analytics and user behavior tracking
- **Added:** Pre-PHDK
- **Risk:** Low — analytics only, no financial operations

### Sentry Error Tracking

- **Purpose:** Frontend and backend error monitoring
- **Added:** Pre-PHDK
- **Risk:** Low — error reporting only, no financial operations

### react-pdf

- **Purpose:** PDF generation for invoices and CFDI documents
- **Added:** Pre-PHDK
- **Risk:** Low — client-side rendering only

---

## Data Backup Policy

- **Decision:** Railway-managed PostgreSQL backups (automatic daily backups)
- **Date:** Project setup
- **Reason:** Railway provides automatic daily backups for PostgreSQL instances. No custom backup job is needed. Point-in-time recovery is available if needed.
- **PHDK Standard:** Explicit backup policy documented here
- **Status:** Railway automatic backups active. Manual restore has not been tested (gap).

---

## i18n

- **Decision:** No i18n system implemented yet
- **Date:** Current
- **Reason:** The platform currently serves a single-language (Spanish) audience. A `Translation` model exists in the database schema for future i18n support. The `next-intl` library is not yet installed.
- **PHDK Standard:** All user-facing strings use the i18n system
- **Gap:** Hardcoded Spanish strings throughout the codebase. To be addressed when multi-language support is needed.

---

## Deploy Workflow

- **Decision:** GitHub Actions workflow with `railway up` for deployment
- **Date:** Pre-PHDK
- **Reason:** The workflow was set up before PHDK standards were adopted. PHDK requires GitHub push to `main` triggering Railway's GitHub-connected pipeline directly (no CI workflow needed for deployment).
- **PHDK Standard:** Never deploy from local CLI — GitHub push to `main` only
- **Gap:** The current `deploy.yml` uses `railway up` which PHDK explicitly prohibits. Should be replaced with Railway's native GitHub integration.
- **Status:** Railway IS connected to GitHub (the `railway.json` healthcheckPath confirms this), but the CI workflow also runs `railway up` as a secondary deploy path. The CI workflow should be removed.
