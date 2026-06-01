# CBC Railway Deployment Cleanup - Design Spec

**Date:** 2026-06-01  
**Approach:** Fast Track (Approach 1)  
**Timeline:** Today  
**Scope:** Full cleanup to get CBC deployed on Railway with zero-touch deployments

---

## Background

After 3 days and 18+ failed deployment attempts, the CBC monorepo has accumulated deployment configuration debt. The current state uses a workaround (`alpine:latest` + manual Node install) that builds successfully but crashes at runtime (502 Bad Gateway).

Root causes identified:
- Stale `package-lock.json` in git (npm lockfile in pnpm project)
- Missing PostCSS config for Tailwind CSS
- `env.ts` validator never imported (missing env vars cause cryptic crashes)
- `bcryptjs` in devDependencies (used at runtime)
- Dockerfile uses unpinned Alpine Node version
- No health check endpoint
- API service deployment topology unclear

---

## Goals

1. Deploy `@cbc/web` (Next.js) as primary Railway service
2. Deploy `@cbc/api` (Node.js cron scheduler) as separate Railway service
3. Zero-touch deployments on push to `main`
4. Clear error messages when env vars are missing
5. Solid foundation for future iteration

---

## Deployment Topology

```
Railway Project: CBC
├── Service 1: cbc-web
│   ├── Root directory: /
│   ├── Builder: DOCKERFILE
│   ├── Dockerfile: /Dockerfile
│   ├── Start: pnpm --filter @cbc/db db:push && node apps/web/server.js
│   ├── Port: 3000
│   └── Domain: coffeebunncafe.com
│
└── Service 2: cbc-api
    ├── Root directory: /apps/api
    ├── Builder: NIXPACKS (auto-detect)
    ├── Start: node src/index.js
    └── Port: 8080
```

Both services deploy from the same repo on push to `main`. 

**Environment variables:**
- `cbc-web` needs: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and all app-specific env vars
- `cbc-api` needs: API keys for external services (Anthropic, OpenAI, etc.), but does NOT directly access the database
- The API service communicates with the web service via HTTP, not direct database access

---

## Dockerfile Design

**Multi-stage build with pinned Node version:**

### Stage 1: Base
- `FROM node:20-alpine` (pinned, not Alpine's random version)
- Enable corepack and prepare pnpm@11.0.9
- Set working directory to `/app`

### Stage 2: Dependencies
- Copy package manifests and Prisma schema
- Run `pnpm install --frozen-lockfile`
- This triggers `postinstall` which runs `prisma generate`

### Stage 3: Builder
- Copy dependencies from Stage 2
- Copy full source code
- Run `pnpm build --filter=@cbc/web` (builds Next.js app)

### Stage 4: Runner (Production)
- Set `NODE_ENV=production`
- Enable corepack and prepare pnpm@11.0.9
- Copy Next.js standalone output (`.next/standalone`)
- Copy static assets (`.next/static`, `public/`)
- Copy full `node_modules` from builder (needed for Prisma CLI and runtime dependencies)
- Copy package manifests and Prisma schema (for running migrations)
- Expose port 3000
- CMD: `node apps/web/server.js` (runs Next.js server directly)

**Trade-offs:**
- Larger image size (includes full node_modules) vs minimal standalone approach
- Ensures Prisma CLI is available for runtime migrations
- Pragmatic choice for "deploy today" timeline

**Benefits:**
- Reproducible builds (pinned versions)
- Fast deployments (layer caching)
- Next.js standalone mode (optimized for production)
- pnpm and prisma CLI available for runtime migrations

---

## Railway Configuration

### cbc-web (`/railway.json`)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "/Dockerfile"
  },
  "deploy": {
    "startCommand": "pnpm --filter @cbc/db db:push && node apps/web/server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Changes from current:**
- Removed `--accept-data-loss` flag (safer for production)
- Added health check endpoint
- Explicit start command runs Next.js server directly

### cbc-api (`/apps/api/railway.json`)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**Changes:**
- Updated schema URL to `railway.com` (from `railway.app`)
- Added restart policy for consistency

---

## Code Fixes

### 1. Remove Stale Files from Git

**Files to untrack:**
- `package-lock.json` (npm lockfile in pnpm project, confuses builders)
- `tsconfig.tsbuildinfo` (TypeScript incremental build cache)

**Command:**
```bash
git rm --cached package-lock.json tsconfig.tsbuildinfo
```

**Also delete:**
- `nul` file (Windows artifact from accidental command)

**Add to `.gitignore`:**
```
nul
tsconfig.tsbuildinfo
```

### 2. Add PostCSS Configuration

**File:** `apps/web/postcss.config.mjs`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Why:** Tailwind CSS requires PostCSS to process `@tailwind` directives. While Next.js has built-in PostCSS support, explicit configuration ensures consistent behavior between dev and production builds.

### 3. Import Environment Validator

**File:** `apps/web/src/app/layout.tsx`

Add at top:
```tsx
import '@/lib/env'
```

**Why:** The `env.ts` file defines a comprehensive Zod schema that validates all environment variables and calls `process.exit(1)` in production if validation fails. Currently it's never imported, so missing env vars cause cryptic runtime errors instead of clear validation failures at startup.

### 4. Move bcryptjs to Dependencies

**File:** `apps/web/package.json`

Move from `devDependencies` to `dependencies`:
```json
"dependencies": {
  "bcryptjs": "^3.0.3",
  // ... other dependencies
}
```

**Why:** `bcryptjs` is used at runtime in `apps/web/src/lib/auth.ts`. While Next.js standalone output should trace and include it, placing a runtime dependency in devDependencies is incorrect and can cause issues with certain deployment strategies.

### 5. Add Health Check Endpoint

**File:** `apps/web/src/app/api/health/route.ts`

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

**Why:** Railway uses health checks to determine if a deployment is successful. Without a health check endpoint, Railway may mark deployments as failed even if the app is running.

### 6. Update .dockerignore

**File:** `.dockerignore`

```
node_modules/
.git/
.gitignore
.env*
*.md
.next/
dist/
.turbo/
package-lock.json
tsconfig.tsbuildinfo
nul
```

**Why:** Excludes unnecessary files from Docker build context, reducing build time and image size.

---

## Implementation Order

1. **Remove stale files from git** (quick win, prevents builder confusion)
2. **Add PostCSS config** (required for Tailwind build)
3. **Import env validator** (fail fast on missing env vars)
4. **Move bcryptjs to dependencies** (correct categorization)
5. **Add health check endpoint** (required for Railway)
6. **Update .gitignore and .dockerignore** (cleanup)
7. **Rewrite Dockerfile** (multi-stage, pinned versions)
8. **Update railway.json files** (both services)
9. **Test build locally** (verify Dockerfile works)
10. **Commit and push** (trigger Railway deployment)
11. **Monitor deployment** (check logs, verify health)
12. **Set up second Railway service** (for cbc-api)

---

## Deferred Items (Not Blocking)

These are code quality improvements that don't block deployment:

1. **Nested `<html>` tags** in login/admin layouts (invalid HTML, but browsers tolerate it)
2. **`turbo.json` env config** (nice-to-have for caching, but not critical)
3. **WhatsApp webhook duplication** (maintenance risk, but not blocking)

These can be addressed in a follow-up session after successful deployment.

---

## Success Criteria

- [ ] `cbc-web` service deploys successfully on push to `main`
- [ ] `cbc-api` service deploys successfully on push to `main`
- [ ] Health check endpoint returns 200 OK
- [ ] App loads at https://coffeebunncafe.com (www redirects to bare domain per next.config.mjs)
- [ ] No 502 Bad Gateway errors
- [ ] Clear error messages if env vars are missing
- [ ] Zero manual intervention required for deployments

---

## Risks & Mitigations

**Risk 1: Railway Metal builder still rejects node:20-alpine**
- **Mitigation:** Fall back to `alpine:latest` + `apk add nodejs=20.x` with pinned version

**Risk 2: Missing environment variables cause runtime crashes**
- **Mitigation:** Env validator imported at app entry, fails fast with clear messages

**Risk 3: Prisma engines not found at runtime**
- **Mitigation:** Copy `.prisma` directory in Dockerfile, ensure `openssl` is installed

**Risk 4: Next.js standalone output missing dependencies**
- **Mitigation:** Test build locally first, verify all routes work

**Risk 5: API service deployment fails**
- **Mitigation:** NIXPACKS builder is simpler and more forgiving, should auto-detect Node.js

---

## Conclusion

This design provides a clean, production-ready deployment setup for the CBC monorepo on Railway. By addressing the root causes (stale files, missing configs, incorrect dependencies) and using best practices (multi-stage Docker builds, pinned versions, health checks), we establish a solid foundation for zero-touch deployments.

The Fast Track approach balances speed (deploy today) with quality (fix critical issues), deferring only non-blocking cosmetic improvements.
