# CBC Platform — New Railway Project Setup

> Use this guide whenever you move to a new Railway account or project.
> Every configuration decision is in this document — nothing lives only in someone's head.

---

## Overview

The platform has two Railway services:
| Service | GitHub path | Description |
|---|---|---|
| `cbc-platform` | repo root (`/`) | Next.js app (public site + admin) |
| `cbc-engine` | `content-engine/` | Autonomous marketing engine |

Plus one managed service: **Postgres** (Railway-native, no code needed).

The Next.js app lives at the **repo root** — `package.json`, `railway.json`, `nixpacks.toml`,
`src/`, and `prisma/` are all at `/`. Railway detects this automatically with **zero manual
configuration**. No Root Directory override needed.

---

## Step 1 — Create the Railway project

1. [railway.com](https://railway.com) → **New Project**
2. Choose **Deploy from GitHub repo** → select `tuyoisaza/CBC`
3. Railway detects `package.json` at root → proposes a Node.js service.
   Accept it — that becomes `cbc-platform`.

---

## Step 2 — Add Postgres

1. Railway project → **+ New** → **Database** → **PostgreSQL**
2. Leave all defaults. Railway manages it automatically.
3. Note the service name (default: `Postgres`).

---

## Step 3 — `cbc-platform` build config (already in repo, nothing to do)

Railway reads these files automatically from the repo root:

**`railway.json`**
```json
{
  "build":  { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand":            "npx prisma db push && npm start",
    "restartPolicyType":       "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "healthcheckPath":         "/api/health",
    "healthcheckTimeout":      120
  }
}
```

**`nixpacks.toml`**
- Pins Node 20
- Explicit `npm ci` install + `npm run build` phases

---

## Step 4 — Set environment variables for `cbc-platform`

In Railway → `cbc-platform` service → **Variables**.

### 4a. Link the database (do this first)
**+ Add Variable** → **Add Reference** → select `Postgres` → `DATABASE_URL`.
This injects the connection string automatically. Never paste a raw DATABASE_URL.

### 4b. Pre-generated values (from `docs/strategy/railway-env-vars.md`)
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://coffeebunncafe.com
NEXT_PUBLIC_ADMIN_URL=https://admin.coffeebunncafe.com
NEXTAUTH_URL=https://admin.coffeebunncafe.com
NEXTAUTH_SECRET=<from railway-env-vars.md>
ADMIN_EMAIL=contact@coffeebunncafe.com
ADMIN_PASSWORD_HASH=<from railway-env-vars.md>
ENGINE_SECRET_TOKEN=<from railway-env-vars.md>
CBC_ENGINE_URL=https://cbc-engine.railway.internal
RESEND_FROM_EMAIL=hola@coffeebunncafe.com
LORENA_PHONE=5215572293512
CBC_RAZON_SOCIAL=COFFEE BUNN CAFE
CBC_REGIMEN_FISCAL=601
CBC_CODIGO_POSTAL_FISCAL=11800
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
CLOUDFLARE_R2_BUCKET=cbc-assets
NEXT_PUBLIC_R2_PUBLIC_URL=https://assets.coffeebunncafe.com
```

### 4c. Secrets to collect (see `.env.example` for where to get each one)
```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
RESEND_API_KEY
WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_VERIFY_TOKEN
META_ACCESS_TOKEN / META_INSTAGRAM_ACCOUNT_ID / META_FACEBOOK_PAGE_ID / META_APP_SECRET
LINKEDIN_ACCESS_TOKEN / LINKEDIN_PERSON_URN
STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY / OPENAI_API_KEY
CLOUDFLARE_R2_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY / CLOUDFLARE_R2_SECRET_KEY
FACTURAPI_KEY / CBC_RFC / CBC_CSD_CERT_BASE64 / CBC_CSD_KEY_BASE64 / CBC_CSD_PASSWORD
SENTRY_DSN / NEXT_PUBLIC_POSTHOG_KEY  (optional)
```

---

## Step 5 — Add `cbc-engine` service

1. **+ New** → **GitHub Repo** → `tuyoisaza/CBC`
2. **Root Directory**: `content-engine`
   *(This is the only service that still needs a root directory override.)*
3. Set environment variables per `docs/strategy/railway-env-vars.md → Service: cbc-engine`.

---

## Step 6 — Add custom domains

Railway → `cbc-platform` → **Settings** → **Domains**:

| Domain | Purpose |
|---|---|
| `coffeebunncafe.com` | Public site (bare domain) |
| `www.coffeebunncafe.com` | Redirects to bare domain (handled in code) |
| `admin.coffeebunncafe.com` | Admin panel |

Railway shows a CNAME target per domain. Update Cloudflare DNS:

| Record | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | Railway CNAME for `coffeebunncafe.com` | 🟠 On |
| CNAME | `www` | Railway CNAME for `www` | 🟠 On |
| CNAME | `admin` | Railway CNAME for `admin` | 🟠 On |

---

## Step 7 — Register webhooks after deploy

**Stripe:** Stripe Dashboard → Webhooks → Add endpoint
- URL: `https://coffeebunncafe.com/api/webhooks/stripe`
- Event: `checkout.session.completed`
- Copy signing secret → set `STRIPE_WEBHOOK_SECRET`

**WhatsApp:** Meta developers → WhatsApp → Configuration → Webhook
- URL: `https://coffeebunncafe.com/api/webhooks/whatsapp`
- Verify token: value of `WHATSAPP_VERIFY_TOKEN`

**Google OAuth:** Cloud Console → Credentials → your OAuth client
- Add redirect URI: `https://admin.coffeebunncafe.com/api/auth/callback/google`

---

## Database initialisation

On first start the service runs:
```
npx prisma db push && npm start
```
`prisma db push` reads `prisma/schema.prisma` and creates all tables. Idempotent — safe on every redeploy.

> When the platform has live data and you need controlled migrations, run
> `npx prisma migrate dev --name <change>` locally, commit `prisma/migrations/`,
> and switch the start command to `prisma migrate deploy && npm start`.

---

## Moving between Railway plans

1. Export Postgres: Railway → Postgres → **Connect** → `pg_dump`
2. Create new Railway project, repeat this guide
3. Import the dump into the new Postgres instance
4. Update DNS CNAME targets → new Railway service domains
5. Decommission old project

No code changes needed.
