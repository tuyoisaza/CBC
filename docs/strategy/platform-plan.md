# CBC Platform — Architecture & Build Plan

**Status:** Planning  
**Deployment target:** Railway  
**Estimated phases:** 4  

---

## What We're Building

Two faces, one platform.

| Face | URL | Who uses it |
|------|-----|-------------|
| **Public site** | coffeebunncafe.com | Corporate buyers — discover, request quote, track order |
| **Admin platform** | admin.coffeebunncafe.com | Lorena + team — run the business |

One Next.js app. One Railway service. One PostgreSQL database.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY SERVICE                          │
│                  CBC Platform (Next.js)                     │
├─────────────────────────┬───────────────────────────────────┤
│   PUBLIC SITE           │   ADMIN PLATFORM                  │
│   coffeebunncafe.com    │   admin.coffeebunncafe.com         │
│                         │                                   │
│   /                     │   /admin/dashboard                │
│   Landing page          │                                   │
│   Gift boxes            │   /admin/marketing                │
│   Quote form            │   Content engine                  │
│                         │   AI posting                      │
│   /tracking/[id]        │                                   │
│   Order status          │   /admin/sales                    │
│   (public, no login)    │   Leads → Quotes → Orders         │
│                         │                                   │
│                         │   /admin/service                  │
│                         │   Customer messages               │
│                         │   Templates                       │
│                         │                                   │
│                         │   /admin/settings                 │
│                         │   API keys, accounts, schedule    │
├─────────────────────────┴───────────────────────────────────┤
│                  PostgreSQL (Railway)                        │
│  customers · orders · leads · quotes · posts · coffee        │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  Meta Graph API              Claude + DALL-E 3
  LinkedIn API                Instagram + Facebook
  WhatsApp Cloud API          LinkedIn
```

---

## Platform-Wide Requirements

These are non-negotiable constraints that apply to every page, every module, every phase.

---

### 1. Bilingual — Spanish & English (ES / EN)

The platform serves Mexican companies (primary) and can serve English-speaking buyers.
Every user-facing string is translated. No hardcoded text in components.

**Implementation: `next-intl`**
- Default locale: `es` → `coffeebunncafe.com/`
- English locale: `en` → `coffeebunncafe.com/en/`
- Admin: locale toggle in the header (stored in cookie, not URL)
- Translation files: `messages/es.json` and `messages/en.json`
- Type-safe: all translation keys are typed — missing keys are caught at build time

**Scope:**
| Area | ES | EN |
|------|----|----|
| Public site (landing, tracking, quote form) | ✓ | ✓ |
| Admin UI (labels, navigation, notifications) | ✓ | ✓ |
| System emails (order confirmations, quotes) | ✓ | ✓ |
| AI-generated social content | ES only | — |
| Curation Card | ES only | — |

---

### 2. Dark Mode & Light Mode

The brand is dark-first (deep black + energy yellow). The admin platform is light-first (easier for long working sessions). Both modes exist on both faces.

**Implementation: `next-themes` + Tailwind CSS dark mode**
- Default (public site): **dark** — matches brand identity
- Default (admin): **light** — better for productivity
- System preference respected on first visit
- Manual toggle available on all pages
- Zero flash on load (SSR-safe)
- Theme stored in cookie and localStorage

**Color mapping:**

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| Background | `#fffaf3` (cream white) | `#262626` (deep black) |
| Surface / card | `#ffffff` | `#333333` |
| Border | `#e5e5e5` | `#444444` |
| Primary text | `#262626` | `#fffaf3` |
| Secondary text | `#636363` | `#a0a0a0` |
| Accent | `#f7b84e` | `#f7b84e` (same — yellow works on both) |
| Accent hover | `#ffd17f` | `#ffd17f` |
| Destructive | `#ef4444` | `#f87171` |

---

### 3. Payments

CBC collects payment from corporate buyers: deposit on order confirmation, balance before delivery.

**Implementation: Stripe**

| Payment method | Use case | Notes |
|---------------|----------|-------|
| Credit / debit card | Primary — fast, universal | Visa, Mastercard, Amex |
| OXXO | Mexican cash payment | Common for SME buyers without corporate card |
| SPEI (bank transfer) | Mexican bank transfer | Most common for B2B corporate; manual confirmation |
| Stripe Payment Link | Send via WhatsApp | No checkout page needed — just a link |

**Payment flow:**
```
Quote accepted
     ↓
Lorena generates Payment Link (50% deposit) in admin
     ↓
Sends link via WhatsApp
     ↓
Buyer pays → Stripe webhook fires → Order status updates to "confirmed"
     ↓
Production begins
     ↓
Lorena sends remaining 50% payment link before delivery
     ↓
Buyer pays → Order status updates to "ready to ship"
```

**Stripe features to use:**
- Payment Links (no custom checkout needed for launch)
- Webhooks (auto-update order status on payment)
- Customer records (link to our Customer model)
- Invoice PDF (Stripe generates; we can also use React-PDF for branded version)
- OXXO payment method (enabled in Stripe dashboard for MXN)

**What we do NOT build at launch:** A custom checkout flow on the public site. Payment is always initiated by Lorena after a quote is accepted — not self-serve. This keeps CBC in control of every order and avoids payment UX complexity at launch.

---

### 4. Best Practices — Full Checklist

#### Performance
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms
- [ ] Images: Next.js `<Image>` component everywhere — auto-format (WebP/AVIF), lazy load, responsive sizes
- [ ] Fonts: self-hosted Raleway (already on coffeebunncafe.com) — no Google Fonts in production
- [ ] Code splitting: automatic via Next.js App Router
- [ ] No render-blocking resources
- [ ] Static generation for landing page (ISR with 1h revalidation for social proof section)

#### SEO (public site)
- [ ] `next/metadata` for all pages — title, description, OG tags, Twitter cards
- [ ] Structured data (JSON-LD): `Organization`, `Product`, `BreadcrumbList`
- [ ] `sitemap.xml` — auto-generated, includes both locales
- [ ] `robots.txt` — public site indexed, `/admin/*` disallowed
- [ ] Canonical URLs — hreflang for ES/EN alternates
- [ ] OpenGraph image — 1200×630 branded image per page

#### Accessibility (WCAG 2.1 AA)
- [ ] All interactive elements keyboard-navigable
- [ ] Focus rings visible (Tailwind `focus-visible:ring`)
- [ ] Color contrast: AA minimum (4.5:1 for text, 3:1 for large text)
- [ ] All images have meaningful `alt` text
- [ ] Form fields have associated `<label>` elements
- [ ] Error messages are descriptive and linked to the field
- [ ] ARIA roles only where semantic HTML is insufficient
- [ ] Skip-to-content link on every page

#### Security
- [ ] HTTPS enforced — Railway provides this automatically
- [ ] Content Security Policy (CSP) headers via `next.config.js`
- [ ] Rate limiting on all API routes (especially quote form and auth)
- [ ] Input validation: Zod schemas on all form submissions, server-side
- [ ] File upload validation: type whitelist (PNG, SVG, JPG only), max size 5MB
- [ ] Admin routes: middleware enforces auth on every `/admin/*` request
- [ ] Stripe webhook signature verification
- [ ] WhatsApp webhook signature verification (Meta's `X-Hub-Signature-256`)
- [ ] Environment variables: never exposed to client, validated at startup with Zod
- [ ] No sensitive data in logs (mask phone numbers, emails)
- [ ] CSRF protection: built-in via NextAuth

#### Reliability
- [ ] Error boundaries on all major UI sections
- [ ] Sentry for error monitoring (client + server)
- [ ] API routes: try/catch + structured error responses
- [ ] Content engine failures: logged, do not crash the platform
- [ ] Database: connection pooling via Prisma
- [ ] Graceful degradation: if AI generation fails, alert in admin — don't silently skip

#### Mobile
- [ ] Mobile-first CSS — all layouts designed for 375px first, scaled up
- [ ] Admin is fully operable on a phone — Lorena runs the business from hers
- [ ] Touch targets minimum 44×44px
- [ ] WhatsApp CTA button: fixed bottom on mobile (public site)
- [ ] Swipeable Kanban cards on mobile (sales pipeline)

#### Analytics
- [ ] PostHog (self-hosted on Railway or cloud): page views, funnel tracking, session recordings
- [ ] Conversion events: quote form submit, WhatsApp CTA click, tracking page visit
- [ ] Admin excluded from analytics
- [ ] No PII sent to analytics (anonymize phone, email)

---

### 5. Environment Variable Validation

All environment variables validated at startup. App does not start with missing required vars.

```typescript
// lib/env.ts — validated with Zod at startup
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  META_ACCESS_TOKEN: z.string().min(1),
  // ... etc
})
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Public + admin + API in one, Railway-native |
| Styling | Tailwind CSS + Shadcn/ui | Dark/light mode built-in, brand-compatible, production-quality |
| Theming | `next-themes` | System-aware dark/light toggle, zero flash on load |
| i18n | `next-intl` | App Router–native ES/EN routing, type-safe translations |
| Database | PostgreSQL (Railway add-on) | Relational data, order tracking, CRM |
| ORM | Prisma | Type-safe queries, easy migrations |
| Auth | NextAuth.js (credentials) | Simple email+password for admin, no login for public |
| Payments | Stripe | Cards, OXXO (MXN), payment links, webhooks |
| SAT Billing | Facturapi | CFDI 4.0 generation, PAC timbrado, XML + PDF, cancellation |
| AI | Anthropic SDK (Claude) | Copy generation, WhatsApp parsing, customer service drafts |
| Images | OpenAI (DALL-E 3) | Branded social media image generation |
| Email | Resend | Order confirmations, quote delivery, payment receipts |
| File storage | Cloudflare R2 + presigned URLs | Client logo uploads, generated images, PDF quotes |
| PDF generation | React-PDF | Branded quote and invoice PDFs, Railway-safe (no headless browser) |
| Background jobs | cbc-engine (separate Railway service) | Cron scheduler — Next.js is not suitable for long-running jobs |
| Realtime | Server-Sent Events (SSE) | Live order status, admin notifications |
| Analytics | Vercel Analytics / PostHog | Page views, conversion funnel, zero PII exposure |
| Error monitoring | Sentry | Client + server errors, production visibility |

---

## Module 1 — Public Site

### Pages

#### `/` — Gift Box Landing Page
- Hero: "El regalo que se recuerda"
- Box Prensa Francesa + Box Moka (cards with pricing)
- 15-box threshold incentive
- The coffee story (micro-lot, Lorena's curation)
- Lorena credibility section
- Social proof (testimonials, client logos)
- FAQ
- CTA: Quote request form → WhatsApp or inline form

#### `/cotizar` — Quote Request Form
- Company name, contact name, email, WhatsApp
- Box type (Prensa / Moka / Mix)
- Quantity (10–14 / 15–30 / 31–50 / 50+)
- Occasion (dropdown: Fin de año / Día del Amor / Día del Trabajo / Otro)
- Logo upload
- Message / special requests
- Submit → creates a Lead in the sales engine + sends WhatsApp notification to Lorena

#### `/tracking/[orderCode]` — Order Tracking
- Customer enters order code
- Shows: order status, estimated delivery, what's in the box
- No login required — just the order code (sent to them after purchase)
- Status steps: Confirmado → En producción → Listo → En camino → Entregado

---

## Module 2 — Marketing Engine (Admin)

### `/admin/marketing`

#### Dashboard view
- Content calendar (week view)
- Next scheduled post + countdown
- Last 5 posts (with image thumbnail, caption preview, platform icons, status)
- Current coffee in use

#### Coffee Manager
- Current micro-lot details (editable form)
- History of past coffees
- This is what the WhatsApp webhook also updates

#### Content Generator
- Manual trigger: select post type → generate preview → approve or regenerate → publish now or schedule
- AI generates caption + image, Lorena (or auto) approves
- Full fire-and-forget mode: toggle per post type (auto-post without approval)

#### Schedule Settings
- Toggle each post type on/off
- Change day/time per post type
- Seasonal campaigns: activate/deactivate

#### Post History
- All published posts with image, caption, platform, date, engagement (if API provides it)

---

## Module 3 — Sales Engine (Admin)

### `/admin/sales`

#### Pipeline View (Kanban)
```
NUEVO → CONTACTADO → COTIZADO → CONFIRMADO → EN PRODUCCIÓN → ENVIADO → ENTREGADO
```
Each card shows: company, quantity, box type, value, days in stage

#### Lead Detail
- Company info, contact, message, source
- Quote history
- Notes
- WhatsApp conversation link
- Quick actions: Send quote, Mark as won/lost, Schedule follow-up

#### Quote Builder
- Select customer
- Add items: Box type × quantity
- Add logo branding (upload client logo)
- Add optional message card text
- Auto-calculate total
- Generate PDF quote → send via email or WhatsApp
- One-click convert to Order when accepted

#### Order Management
- All active orders with status
- Update status → triggers customer notification (WhatsApp + email)
- Add tracking number
- Notes and production checklist

#### Customer Database (CRM)
- Company name, industry, size
- Primary contact + WhatsApp
- Order history (total orders, total value, last order date)
- Tags: VIP, repeat, referral source
- Notes

#### SAT / CFDI Billing
- Collect RFC + fiscal data from client on quote form (required)
- RFC format validation (regex + checksum, client and server side)
- Auto-generate CFDI via Facturapi when payment is confirmed
- Cancel CFDI with SAT reason code when needed
- Download XML + PDF from order detail and client tracking page
- CBC fiscal config stored encrypted in settings

#### Revenue Dashboard
- Monthly revenue
- Orders by status
- Top customers
- Average order size
- Conversion rate (leads → orders)

---

## Module 4 — Customer Service (Admin)

### `/admin/service`

#### Inbox
- All incoming WhatsApp messages (via webhook)
- All quote form submissions
- Unread / needs response filter
- Assign to open lead or create new

#### Response Templates
- Pre-written replies for common questions (MOQ, lead time, branding, pricing)
- One-click send via WhatsApp
- Variables: {{company_name}}, {{quantity}}, {{total_price}}, {{delivery_date}}

#### AI Draft Assistant
- For any incoming message: "Draft reply" button
- Claude generates a response in Lorena's voice based on the context
- She reviews and sends — or sends without review (configurable)

---

## Module 5 — Settings (Admin)

### `/admin/settings`

#### Social Accounts
- Connection status for Instagram, Facebook, LinkedIn
- Token expiry dates + renewal reminders
- Connect / reconnect flow

#### API Keys
- Anthropic, OpenAI, Meta, LinkedIn, WhatsApp, Resend, Cloudflare R2
- Masked display, update in place
- Test connection button per key

#### Brand Voice
- The master prompt Lorena edits ~quarterly
- Rich text editor
- Version history (so she can revert)

#### Notifications
- WhatsApp number that receives alerts (new lead, new order, failed post)
- Email for invoices and quotes

---

## Data Model

```prisma
model Customer {
  id            String   @id @default(cuid())
  companyName   String
  contactName   String
  email         String?
  whatsapp      String?
  city          String?
  industry      String?
  notes         String?
  tags          String[]
  leads         Lead[]
  orders        Order[]
  createdAt     DateTime @default(now())
}

model Lead {
  id          String   @id @default(cuid())
  customer    Customer @relation(fields: [customerId], references: [id])
  customerId  String
  source      String   // quote-form, whatsapp, linkedin, referral
  message     String?
  boxType     String?  // prensa, moka, mix
  quantity    Int?
  occasion    String?
  status      String   @default("new") // new, contacted, quoted, confirmed, lost
  quotes      Quote[]
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Quote {
  id          String   @id @default(cuid())
  lead        Lead     @relation(fields: [leadId], references: [id])
  leadId      String
  customer    Customer @relation(fields: [customerId], references: [id])
  customerId  String
  items       Json     // [{type: 'prensa', quantity: 20, unitPrice: 799}]
  subtotal    Float
  total       Float
  logoUrl     String?
  messageCard String?
  status      String   @default("draft") // draft, sent, accepted, rejected
  pdfUrl      String?
  sentAt      DateTime?
  order       Order?
  createdAt   DateTime @default(now())
}

model Order {
  id            String   @id @default(cuid())
  orderCode     String   @unique // CBC-2025-001 — used for public tracking
  quote         Quote    @relation(fields: [quoteId], references: [id])
  quoteId       String   @unique
  customer      Customer @relation(fields: [customerId], references: [id])
  customerId    String
  status        String   @default("confirmed")
  // confirmed | in_production | ready | shipped | delivered
  trackingNumber String?
  coffeeId      String?  // which coffee was in this order
  coffee        Coffee?  @relation(fields: [coffeeId], references: [id])
  estimatedDate DateTime?
  deliveredAt   DateTime?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Coffee {
  id           String   @id @default(cuid())
  name         String
  originCountry String
  originRegion  String
  originFarm    String?
  variety       String?
  process       String?
  roast         String?
  tastingNotes  String[]
  story         String?
  active        Boolean  @default(false)
  orders        Order[]
  createdAt     DateTime @default(now())
}

model Post {
  id          String   @id @default(cuid())
  platform    String   // instagram, facebook, linkedin
  contentType String   // product-post, coffee-story, linkedin-post, seasonal
  caption     String
  imageUrl    String?
  status      String   @default("draft") // draft, scheduled, published, failed
  publishedAt DateTime?
  scheduledFor DateTime?
  errorMsg    String?
  createdAt   DateTime @default(now())
}

model Payment {
  id                String   @id @default(cuid())
  order             Order    @relation(fields: [orderId], references: [id])
  orderId           String
  stripePaymentId   String?  @unique
  stripeCustomerId  String?
  amount            Float
  currency          String   @default("MXN")
  method            String   // card | oxxo | spei | manual
  type              String   // deposit | balance
  status            String   @default("pending") // pending | paid | failed
  paymentLinkUrl    String?
  paidAt            DateTime?
  createdAt         DateTime @default(now())
}

model Invoice {
  id          String   @id @default(cuid())
  invoiceCode String   @unique // CBC-INV-2025-001
  order       Order    @relation(fields: [orderId], references: [id])
  orderId     String   @unique
  amount      Float
  currency    String   @default("MXN")
  status      String   @default("pending") // pending | paid | overdue | cancelled
  pdfUrl      String?
  dueDate     DateTime?
  paidAt      DateTime?
  createdAt   DateTime @default(now())
}

model Message {
  id         String   @id @default(cuid())
  from       String   // phone number or email
  to         String?
  body       String
  direction  String   // inbound | outbound
  platform   String   // whatsapp | email | form
  status     String   @default("unread") // unread | read | replied
  lead       Lead?    @relation(fields: [leadId], references: [id])
  leadId     String?
  aiDraft    String?  // Claude-generated reply draft
  createdAt  DateTime @default(now())
}

model Translation {
  id        String   @id @default(cuid())
  locale    String   // es | en
  namespace String   // common | landing | admin | emails
  key       String
  value     String
  updatedAt DateTime @updatedAt

  @@unique([locale, namespace, key])
}

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## Build Roadmap

### Phase 1 — Foundation (Week 1–2)
**Constraints:** Mobile-first from day one. Dark/light mode wired from day one. i18n scaffolded from day one. All three are harder to retrofit than to build in.

- [ ] Next.js 14 app scaffold (Railway-ready, App Router)
- [ ] `next-intl` setup — ES/EN routing, `messages/es.json` + `messages/en.json`
- [ ] `next-themes` setup — dark/light toggle, system preference, zero flash
- [ ] Tailwind config — CBC design tokens (colors, fonts, dark mode mapping)
- [ ] Shadcn/ui — component library initialized with CBC theme
- [ ] PostgreSQL + Prisma setup — full schema including Payment, Invoice, Message, Translation
- [ ] Env variable validation (Zod schema at startup)
- [ ] Sentry integration (error monitoring from day one)
- [ ] Auth (NextAuth — admin login, middleware protecting `/admin/*`)
- [ ] Public landing page — ES + EN, dark mode default, mobile-first
- [ ] Quote request form — with logo upload (R2 presigned URL), Zod validation
- [ ] Form submit → Lead created in DB + WhatsApp notification to Lorena
- [ ] Admin shell — layout, nav, dark/light toggle, locale switcher
- [ ] Deploy to Railway — both domains live

**Deliverable:** Public landing page live in ES + EN, dark and light mode. Quote form working. Admin shell accessible. Monitoring live.

---

### Phase 2 — Sales Engine + Payments (Week 3–4)
- [ ] Lead pipeline — Kanban view, swipeable on mobile
- [ ] Lead detail — company info, notes, conversation history, quick actions
- [ ] Quote builder — items, logo upload, message card, auto-total
- [ ] Quote PDF — React-PDF, branded, ES + EN versions
- [ ] Stripe integration — Payment Links, OXXO, webhook handler
- [ ] Payment flow — deposit link → webhook → order confirmed → balance link
- [ ] Invoice generation — React-PDF, branded, sent via Resend + WhatsApp
- [ ] Order management — status pipeline, status update → customer notification
- [ ] Customer tracking page `/tracking/[orderCode]` — public, no login, ES + EN
- [ ] Customer database (CRM) — company, contacts, order history, tags
- [ ] Revenue dashboard — MRR, orders by status, top customers, conversion rate
- [ ] WhatsApp + email notifications on every order status change

**Deliverable:** Lorena receives a lead, builds a quote, generates a Stripe payment link, confirms payment via webhook, tracks production, and updates delivery status. Customer tracks their order publicly.

---

### Phase 3 — Marketing Engine (Week 4–5)
- [ ] Connect cbc-engine service to platform via internal API
- [ ] Coffee manager UI — current micro-lot form, history, active/inactive
- [ ] Post scheduler — calendar view, toggle per post type, time/day config
- [ ] Content generator — manual trigger, AI preview (caption + image), approve or regenerate
- [ ] Fire-and-forget mode — **default ON** — per post type toggle in settings
- [ ] Post history feed — thumbnail, caption preview, platform, status, timestamp
- [ ] WhatsApp webhook UI — show last coffee update, timestamp, confirmation
- [ ] Seasonal campaign controls — activate/deactivate by season, preview

**Deliverable:** Marketing engine fully visible and controllable from the admin. Lorena updates coffee, machine does the rest. Fire-and-forget is on by default.

---

### Phase 4 — Customer Service + Polish (Week 5–7)
- [ ] Message inbox — all incoming WhatsApp messages, unread filter, assign to lead
- [ ] AI draft assistant — "Draft reply" button → Claude generates in Lorena's voice
- [ ] Response templates — pre-written, with variables, one-click send
- [ ] Settings — API keys (masked + test), social account status + expiry alerts, brand voice editor with version history, notification preferences
- [ ] PostHog analytics — funnel tracking, conversion events, session recordings
- [ ] Full accessibility audit — WCAG 2.1 AA pass
- [ ] Performance audit — Core Web Vitals pass, Lighthouse 90+
- [ ] SEO audit — meta tags, structured data, sitemap, hreflang, OG images
- [ ] Security audit — CSP headers, rate limiting, input validation review
- [ ] Mobile QA — full admin flow on iPhone + Android

**Deliverable:** Full platform live. Every best practice checked. Lorena runs the entire business from her phone.

---

## Railway Deployment Plan

```
Project: CBC (existing)
├── Service 1: cbc-platform (Next.js) ← new
│   Domain 1: coffeebunncafe.com (public)
│   Domain 2: admin.coffeebunncafe.com (admin)
└── Service 2: cbc-db (PostgreSQL) ← new add-on
```

The existing Railway project (ID: 3f019384-571b-4603-a0ab-2a8169c712dc) gets two new resources.
The standalone `content-engine/` we already built gets absorbed into the platform — nothing wasted.

---

## Environment Variables

All variables validated at startup with Zod. App refuses to start with missing required vars.

```bash
# ─── App ──────────────────────────────────────────
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://coffeebunncafe.com
NEXT_PUBLIC_ADMIN_URL=https://admin.coffeebunncafe.com
CBC_ENGINE_URL=https://engine.internal.railway.app  # internal Railway URL

# ─── Database ─────────────────────────────────────
DATABASE_URL=postgresql://...

# ─── Auth ─────────────────────────────────────────
NEXTAUTH_SECRET=random_32+_char_string
NEXTAUTH_URL=https://admin.coffeebunncafe.com
ADMIN_EMAIL=contact@coffeebunncafe.com
ADMIN_PASSWORD_HASH=bcrypt_hash

# ─── Payments (Stripe) ────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# ─── SAT / Facturapi ──────────────────────────────
FACTURAPI_KEY=sk_live_...
FACTURAPI_KEY_TEST=sk_test_...
CBC_RFC=CBC######XXX
CBC_RAZON_SOCIAL=COFFEE BUNN CAFE SA DE CV
CBC_REGIMEN_FISCAL=601
CBC_CODIGO_POSTAL_FISCAL=11800
CBC_CSD_CERT_BASE64=...            # .cer file base64 encoded
CBC_CSD_KEY_BASE64=...             # .key file base64 encoded
CBC_CSD_PASSWORD=...               # CSD password (encrypted at rest)

# ─── AI ───────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# ─── Meta (Instagram + Facebook) ──────────────────
META_ACCESS_TOKEN=...
META_INSTAGRAM_ACCOUNT_ID=...
META_FACEBOOK_PAGE_ID=...
META_APP_SECRET=...           # for webhook signature verification

# ─── LinkedIn ─────────────────────────────────────
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=urn:li:person:...
LINKEDIN_ORGANIZATION_URN=urn:li:organization:...  # optional company page

# ─── WhatsApp (Meta Cloud API) ────────────────────
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...     # random string, you choose
LORENA_PHONE=521XXXXXXXXXX    # Lorena's personal number (for coffee updates)

# ─── Email (Resend) ───────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hola@coffeebunncafe.com

# ─── File Storage (Cloudflare R2) ─────────────────
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=cbc-assets
NEXT_PUBLIC_R2_PUBLIC_URL=https://assets.coffeebunncafe.com

# ─── Monitoring ───────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## What We Already Have (reusable)

| Asset | Location | Status |
|-------|----------|--------|
| Brand config | `content-engine/config/brand.json` | ✓ Ready — moves to DB |
| Coffee config | `content-engine/config/coffee.json` | ✓ Ready — moves to DB |
| Copy generator | `content-engine/src/generators/copy.js` | ✓ Ready — moves to API route |
| Image generator | `content-engine/src/generators/image.js` | ✓ Ready — moves to API route |
| Meta publisher | `content-engine/src/publishers/meta.js` | ✓ Ready — moves to API route |
| LinkedIn publisher | `content-engine/src/publishers/linkedin.js` | ✓ Ready — moves to API route |
| WhatsApp webhook | `content-engine/src/webhooks/whatsapp.js` | ✓ Ready — moves to API route |
| Scheduler | `content-engine/src/scheduler.js` | ✓ Ready — moves to background worker |
| Landing page copy | `docs/sales/landing-page-copy.md` | ✓ Ready — becomes Phase 1 public page |
| Sales pitch templates | `docs/sales/pitch-corporativo.md` | ✓ Ready — becomes response templates |
| GTM strategy | `docs/strategy/gift-boxes-gtm.md` | ✓ Reference |
| Product spec | `docs/specs/product-gift-boxes.md` | ✓ Reference |
