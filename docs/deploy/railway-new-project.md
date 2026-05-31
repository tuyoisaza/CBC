# CBC Platform — New Railway Project Setup

> Use this guide whenever you move to a new Railway account or project.
> Every configuration decision is in this document — nothing lives only in someone's head.

---

## Overview

The platform has two Railway services:
| Service | GitHub path | Description |
|---|---|---|
| `cbc-platform` | `cbc-platform/` | Next.js app (public site + admin) |
| `cbc-engine` | `content-engine/` | Autonomous marketing engine |

Plus one managed service: **Postgres** (Railway-native, no code needed).

---

## Step 1 — Create the Railway project

1. [railway.com](https://railway.com) → **New Project**
2. Choose **Deploy from GitHub repo** → select `tuyoisaza/CBC`
3. Railway will offer to add all services. **Skip** — add them manually in the steps below for full control.

---

## Step 2 — Add Postgres

1. Railway project → **+ New** → **Database** → **PostgreSQL**
2. Leave all defaults. Railway manages it automatically.
3. Note the service name (default: `Postgres`).

---

## Step 3 — Add `cbc-platform` service

1. **+ New** → **GitHub Repo** → `tuyoisaza/CBC`
2. **Root Directory**: set to `cbc-platform`
   - This is the only setting that cannot be in code. Everything else is in `railway.json` and `nixpacks.toml`.
3. Railway will detect `railway.json` and use its configuration automatically.

### What `railway.json` provides (already in repo):
```json
{
  "build":  { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand":         "npx prisma db push && npm start",
    "restartPolicyType":    "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "healthcheckPath":      "/api/health",
    "healthcheckTimeout":   120
  }
}
```

### What `nixpacks.toml` provides (already in repo):
- Node 20 (pins the build environment)
- `npm ci` install + `npm run build`

---

## Step 4 — Set environment variables for `cbc-platform`

In Railway → `cbc-platform` service → **Variables**.

### 4a. Link the database (CRITICAL — do this first)
Click **+ Add Variable** → **Add Reference** → select `Postgres` → `DATABASE_URL`.
This injects the connection string automatically. Do NOT paste a DATABASE_URL manually.

### 4b. Pre-generated values (paste as-is from `docs/strategy/railway-env-vars.md`)
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
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RESEND_API_KEY
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
META_ACCESS_TOKEN
META_INSTAGRAM_ACCOUNT_ID
META_FACEBOOK_PAGE_ID
META_APP_SECRET
LINKEDIN_ACCESS_TOKEN
LINKEDIN_PERSON_URN
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY
OPENAI_API_KEY
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY
CLOUDFLARE_R2_SECRET_KEY
FACTURAPI_KEY
CBC_RFC
CBC_CSD_CERT_BASE64
CBC_CSD_KEY_BASE64
CBC_CSD_PASSWORD
SENTRY_DSN            (optional)
NEXT_PUBLIC_POSTHOG_KEY  (optional)
```

---

## Step 5 — Add `cbc-engine` service

1. **+ New** → **GitHub Repo** → `tuyoisaza/CBC`
2. **Root Directory**: set to `content-engine`
3. Set environment variables (see `docs/strategy/railway-env-vars.md` → Service: cbc-engine section).

---

## Step 6 — Add custom domains

In Railway → `cbc-platform` → **Settings** → **Domains**:

| Domain | Purpose |
|---|---|
| `coffeebunncafe.com` | Public site (bare domain) |
| `www.coffeebunncafe.com` | Redirects to bare domain (handled in code) |
| `admin.coffeebunncafe.com` | Admin panel |

Railway will show a **CNAME target** for each domain.  
Update DNS in Cloudflare:

| Record | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | Railway CNAME for `coffeebunncafe.com` | 🟠 On |
| CNAME | `www` | Railway CNAME for `www.coffeebunncafe.com` | 🟠 On |
| CNAME | `admin` | Railway CNAME for `admin.coffeebunncafe.com` | 🟠 On |

> **Note:** Cloudflare uses CNAME Flattening for the apex (`@`) record automatically.

---

## Step 7 — Register webhooks after deploy

Once the services are live:

**Stripe webhook:**
- Dashboard → Webhooks → Add endpoint
- URL: `https://coffeebunncafe.com/api/webhooks/stripe`
- Events: `checkout.session.completed`
- Copy the signing secret → set `STRIPE_WEBHOOK_SECRET` in Railway

**WhatsApp webhook:**
- Meta developers → WhatsApp → Configuration → Webhook
- URL: `https://coffeebunncafe.com/api/webhooks/whatsapp`
- Verify token: value of `WHATSAPP_VERIFY_TOKEN`

**Google OAuth redirect URI:**
- Google Cloud Console → APIs & Services → Credentials → your OAuth client
- Add: `https://admin.coffeebunncafe.com/api/auth/callback/google`

---

## How the database is set up

On first start, the `cbc-platform` service runs:
```
npx prisma db push && npm start
```

`prisma db push` reads `prisma/schema.prisma` and creates all tables in the Postgres database automatically. It is **idempotent** — safe to run on every deploy (only applies changes, never drops data).

> When the platform has live production data and needs controlled schema migrations,
> run `npx prisma migrate dev --name <change>` locally and commit the generated
> `prisma/migrations/` directory. Then switch the start command back to
> `prisma migrate deploy && npm start`.

---

## Verify the deploy

| Check | Expected |
|---|---|
| `https://coffeebunncafe.com` | Landing page |
| `https://coffeebunncafe.com/api/health` | `{"ok":true}` |
| `https://admin.coffeebunncafe.com/login` | Login page |
| Railway healthcheck | Green |

---

## Moving between Railway plans

The entire platform is stateless (beyond the Postgres database). To move plans:

1. Export the Postgres database: Railway → Postgres → **Connect** → `pg_dump`
2. Create new Railway project (repeat steps above)
3. Import the dump into the new Postgres instance
4. Update DNS CNAME targets to the new Railway service domains
5. Decommission the old project

No code changes needed.
