# Railway Deployment Cleanup - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy CBC monorepo to Railway with zero-touch deployments and clear error handling.

**Architecture:** Multi-stage Dockerfile for cbc-web (Next.js), NIXPACKS for cbc-api (Node.js cron). Both services deploy from same repo on push to main.

**Tech Stack:** Next.js 14, pnpm 11, Prisma 5, Railway, Docker

---

## Task 1: Remove Stale Files from Git

**Files:**
- Delete: `package-lock.json` (from git tracking)
- Delete: `tsconfig.tsbuildinfo` (from git tracking)
- Delete: `nul` (physical file)
- Modify: `.gitignore`

- [ ] **Step 1: Untrack stale files from git**

```bash
git rm --cached package-lock.json tsconfig.tsbuildinfo
```

- [ ] **Step 2: Delete the nul file**

```bash
rm nul
```

- [ ] **Step 3: Update .gitignore**

Add these lines to `.gitignore`:
```
nul
```

Note: `tsconfig.tsbuildinfo` is already in .gitignore (line 21).

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: remove stale files from git tracking"
```

---

## Task 2: Add PostCSS Configuration

**Files:**
- Create: `apps/web/postcss.config.mjs`

- [ ] **Step 1: Create PostCSS config**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/postcss.config.mjs
git commit -m "fix: add PostCSS config for Tailwind CSS"
```

---

## Task 3: Import Environment Validator

**Files:**
- Modify: `apps/web/src/app/layout.tsx:1-5`

- [ ] **Step 1: Add env import**

Add at the top of `apps/web/src/app/layout.tsx` (after line 4):
```tsx
import '@/lib/env'
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "fix: import env validator to fail fast on missing vars"
```

---

## Task 4: Move bcryptjs to Dependencies

**Files:**
- Modify: `apps/web/package.json:48-53`

- [ ] **Step 1: Move bcryptjs from devDependencies to dependencies**

In `apps/web/package.json`:
- Remove `"bcryptjs": "^3.0.3",` from devDependencies (line 53)
- Add `"bcryptjs": "^3.0.3",` to dependencies (after line 32, alphabetically)

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json
git commit -m "fix: move bcryptjs to dependencies (used at runtime)"
```

---

## Task 5: Verify Health Check Endpoint

**Files:**
- Verify: `apps/web/src/app/api/health/route.ts`

- [ ] **Step 1: Check if health endpoint exists**

```bash
ls apps/web/src/app/api/health/route.ts
```

If it exists, skip to commit. If not, create it:

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

- [ ] **Step 2: Commit (if created)**

```bash
git add apps/web/src/app/api/health/route.ts
git commit -m "feat: add health check endpoint"
```

---

## Task 6: Update .dockerignore

**Files:**
- Modify: `.dockerignore`

- [ ] **Step 1: Update .dockerignore**

Replace contents with:
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

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "chore: update .dockerignore"
```

---

## Task 7: Rewrite Dockerfile

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Write new multi-stage Dockerfile**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/db/schema.prisma packages/db/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build --filter=@cbc/web

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/db ./packages/db

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "fix: rewrite Dockerfile with multi-stage build and pinned Node 20"
```

---

## Task 8: Update railway.json for cbc-web

**Files:**
- Modify: `railway.json`

- [ ] **Step 1: Update railway.json**

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

- [ ] **Step 2: Commit**

```bash
git add railway.json
git commit -m "fix: update railway.json with health check and safer migrations"
```

---

## Task 9: Update railway.json for cbc-api

**Files:**
- Modify: `apps/api/railway.json`

- [ ] **Step 1: Update apps/api/railway.json**

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

- [ ] **Step 2: Commit**

```bash
git add apps/api/railway.json
git commit -m "fix: update api railway.json schema and add restart policy"
```

---

## Task 10: Test Docker Build Locally

**Files:** None (testing only)

- [ ] **Step 1: Build Docker image locally**

```bash
docker build -t cbc-web-test .
```

Expected: Build completes successfully.

- [ ] **Step 2: Run container locally**

```bash
docker run -p 3000:3000 --env-file .env.local cbc-web-test
```

Expected: App starts on port 3000.

- [ ] **Step 3: Test health endpoint**

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Test app loads**

Open browser to `http://localhost:3000`

Expected: App loads without errors.

---

## Task 11: Commit All Changes and Push

**Files:** None (git operations)

- [ ] **Step 1: Check git status**

```bash
git status
```

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

Expected: Push succeeds, Railway deployment triggers.

---

## Task 12: Monitor Railway Deployment

**Files:** None (monitoring)

- [ ] **Step 1: Check deployment status**

```bash
railway deployment list --json
```

Expected: Latest deployment shows status BUILDING or DEPLOYING.

- [ ] **Step 2: Wait for deployment to complete**

```bash
sleep 180 && railway deployment list --json
```

Expected: Latest deployment shows status SUCCESS.

- [ ] **Step 3: Check deployment logs**

```bash
railway logs --deployment <deployment-id>
```

Expected: No errors in logs.

- [ ] **Step 4: Test production health endpoint**

```bash
curl https://cbc-platform-production.up.railway.app/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 5: Test production app**

Open browser to `https://coffeebunncafe.com`

Expected: App loads without 502 errors.

---

## Task 13: Set Up cbc-api Railway Service

**Files:** None (Railway dashboard operations)

- [ ] **Step 1: Create new Railway service**

In Railway dashboard:
1. Click "New Service"
2. Select "GitHub Repo"
3. Choose `tuyoisaza/CBC`
4. Set root directory to `/apps/api`
5. Name it `cbc-api`

- [ ] **Step 2: Configure environment variables**

Add required env vars for cbc-api:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- Any other API keys from `.env.example` in `apps/api/`

- [ ] **Step 3: Deploy cbc-api**

Railway should auto-detect Node.js via NIXPACKS and deploy.

- [ ] **Step 4: Verify cbc-api deployment**

Check logs in Railway dashboard for cbc-api service.

Expected: Service starts successfully.

---

## Success Criteria

- [ ] cbc-web deploys successfully on push to main
- [ ] cbc-api deploys successfully on push to main
- [ ] Health check returns 200 OK
- [ ] App loads at https://coffeebunncafe.com
- [ ] No 502 Bad Gateway errors
- [ ] Clear error messages if env vars are missing
- [ ] Zero manual intervention required for deployments
