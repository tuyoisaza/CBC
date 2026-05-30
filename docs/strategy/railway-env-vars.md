# Railway Environment Variables
> Set these in the Railway dashboard: railway.com → Project CBC → each service → Variables

---

## Service: cbc-platform

### Already generated — paste these as-is

```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://coffeebunncafe.com
NEXT_PUBLIC_ADMIN_URL=https://admin.coffeebunncafe.com
NEXTAUTH_URL=https://admin.coffeebunncafe.com
NEXTAUTH_SECRET=909ec9b685a3c1b736a1f910e31d6572e0afdf3dc258ab657af279b8e5e11f02
ADMIN_EMAIL=contact@coffeebunncafe.com
ADMIN_PASSWORD_HASH=$2b$12$Dh.IE2M6CVKidn6rO5fSEOisLvrO0PwZ4xnGMYLrbt0LlFd6IunKy
ENGINE_SECRET_TOKEN=c484664874dc67a76a4c1e568395453cd5674ee367324f2542316dc1823c4bca
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

**Admin login credentials:**
- Email: `contact@coffeebunncafe.com`
- Password: `CBC@Admin2025!`
  *(Change this after first login via Settings)*

---

### DATABASE_URL — auto-set by Railway
In Railway dashboard: cbc-platform service → Variables → Add Reference → select Postgres → DATABASE_URL
This auto-injects the connection string. Do not copy-paste manually.

---

### Need to collect — paste values once you have them

```
# Google OAuth (console.cloud.google.com → APIs & Services → Credentials)
# Create an OAuth 2.0 Client ID → Web application
# Authorized redirect URI: https://admin.coffeebunncafe.com/api/auth/callback/google
GOOGLE_CLIENT_ID=            # Client ID from Google Cloud Console
GOOGLE_CLIENT_SECRET=        # Client secret from Google Cloud Console

# Stripe (stripe.com/dashboard → Developers → API Keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...     # Stripe → Webhooks → your endpoint → Signing secret

# Anthropic (console.anthropic.com → API Keys)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (platform.openai.com → API Keys)
OPENAI_API_KEY=sk-...

# Meta / Instagram / Facebook (developers.facebook.com → your app)
META_ACCESS_TOKEN=           # Long-lived page access token
META_INSTAGRAM_ACCOUNT_ID=  # Numeric ID of the Instagram Business account
META_FACEBOOK_PAGE_ID=       # Numeric ID of the Facebook Page
META_APP_SECRET=             # App Secret from app settings

# LinkedIn (linkedin.com/developers → your app → Auth)
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_PERSON_URN=urn:li:person:...

# WhatsApp (developers.facebook.com → WhatsApp → API Setup)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=c484664874dc67a76a4c1e568395453  # use first 32 chars of ENGINE_SECRET_TOKEN

# Email (resend.com → API Keys)
RESEND_API_KEY=re_...

# Cloudflare R2 (cloudflare.com → R2 → Manage API Tokens)
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=

# SAT / Facturapi (facturapi.io → API Keys)
FACTURAPI_KEY=sk_live_...
CBC_RFC=                        # CBC's RFC from SAT
CBC_CSD_CERT_BASE64=            # base64 of CBC's .cer file
CBC_CSD_KEY_BASE64=             # base64 of CBC's .key file
CBC_CSD_PASSWORD=               # CSD password from SAT

# Monitoring — optional
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## Service: cbc-engine

### Already generated — paste these as-is

```
NODE_ENV=production
ENGINE_SECRET_TOKEN=c484664874dc67a76a4c1e568395453cd5674ee367324f2542316dc1823c4bca
PLATFORM_URL=https://coffeebunncafe.com
PORT=3001
WHATSAPP_VERIFY_TOKEN=c484664874dc67a76a4c1e568395453
LORENA_PHONE=5215572293512
```

### Need to collect — same keys as platform

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
META_ACCESS_TOKEN=
META_INSTAGRAM_ACCOUNT_ID=
META_FACEBOOK_PAGE_ID=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_PERSON_URN=urn:li:person:...
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

---

## Service: Postgres
No variables needed — Railway manages this automatically.
Just make sure DATABASE_URL is referenced in cbc-platform.

---

## After setting all variables

1. **Run database migrations** from Railway dashboard:
   - cbc-platform → Settings → Deploy → Add build command:
     `npx prisma migrate deploy && next build`
   - Or run manually: `railway run --service cbc-platform npx prisma migrate deploy`

2. **Set up Stripe webhook**:
   - Stripe dashboard → Webhooks → Add endpoint
   - URL: `https://coffeebunncafe.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`

3. **Set up WhatsApp webhook**:
   - Meta developers → WhatsApp → Configuration → Webhook
   - URL: `https://coffeebunncafe.com/api/webhooks/whatsapp`
   - Verify token: `c484664874dc67a76a4c1e568395453`

4. **Set up custom domains** in Railway:
   - cbc-platform → Settings → Domains
   - Add `coffeebunncafe.com` and `admin.coffeebunncafe.com`
   - Update DNS at your registrar (CNAME to Railway's domain)

5. **Redeploy** both services after all variables are set.

---

## Build URLs

- cbc-platform: https://railway.com/project/3f019384-571b-4603-a0ab-2a8169c712dc/service/6c73954d-dac9-4bc9-ba8d-040d59ec2de7
- cbc-engine: https://railway.com/project/3f019384-571b-4603-a0ab-2a8169c712dc/service/8161499c-6703-49b0-bb0e-a4d8881c26ae
- Railway project: https://railway.com/project/3f019384-571b-4603-a0ab-2a8169c712dc
