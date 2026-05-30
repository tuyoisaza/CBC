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

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Public + admin + API in one, Railway-native |
| Styling | Tailwind CSS + Shadcn/ui | Fast, brand-compatible, production-quality components |
| Database | PostgreSQL (Railway add-on) | Relational data, order tracking, CRM |
| ORM | Prisma | Type-safe queries, easy migrations |
| Auth | NextAuth.js (credentials) | Simple email+password for admin, no login for public |
| AI | Anthropic SDK (Claude) | Copy generation, WhatsApp parsing, customer service drafts |
| Images | OpenAI (DALL-E 3) | Branded social media image generation |
| Email | Resend | Order confirmations, quote delivery |
| File storage | Cloudflare R2 | Client logo uploads, generated images |
| Background jobs | Custom scheduler (node-cron) | Automated posting, no external queue needed |
| Realtime | Server-Sent Events (SSE) | Live order status updates, no extra service |

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

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## Build Roadmap

### Phase 1 — Foundation (Week 1–2)
- [ ] Next.js app scaffold (Railway-ready)
- [ ] PostgreSQL + Prisma setup
- [ ] Auth (NextAuth — admin login)
- [ ] Public landing page (using copy from landing-page-copy.md)
- [ ] Quote request form → creates Lead in DB
- [ ] Admin dashboard shell (layout, nav)
- [ ] Deploy to Railway

**Deliverable:** Public landing page live. Quote form working. Admin accessible.

### Phase 2 — Sales Engine (Week 2–3)
- [ ] Lead pipeline (Kanban view)
- [ ] Lead detail + notes
- [ ] Quote builder + PDF generation
- [ ] Order management + status updates
- [ ] Customer tracking page (`/tracking/[orderCode]`)
- [ ] WhatsApp notifications on order status change
- [ ] Customer database

**Deliverable:** Lorena can receive a lead, build a quote, convert to order, and update status. Customer can track their order.

### Phase 3 — Marketing Engine (Week 3–4)
- [ ] Absorb content engine code into Next.js API routes
- [ ] Coffee manager (form + history)
- [ ] Post scheduler (view + toggle)
- [ ] Manual content trigger + preview
- [ ] Post history feed
- [ ] WhatsApp webhook for coffee updates
- [ ] Fire-and-forget mode

**Deliverable:** Marketing engine running inside the platform. Lorena updates coffee from the app or WhatsApp.

### Phase 4 — Customer Service + Polish (Week 4–5)
- [ ] Incoming message inbox (WhatsApp webhook → UI)
- [ ] Response templates
- [ ] AI draft assistant (Claude-powered)
- [ ] Settings page (API keys, social accounts, brand voice)
- [ ] Revenue dashboard
- [ ] Email notifications (Resend)
- [ ] Mobile-responsive admin

**Deliverable:** Full platform live. Lorena can run the business from her phone.

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

## Environment Variables Needed

```
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=random_secret
NEXTAUTH_URL=https://admin.coffeebunncafe.com
ADMIN_EMAIL=contact@coffeebunncafe.com
ADMIN_PASSWORD=hashed_password

# AI
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Meta
META_ACCESS_TOKEN=...
META_INSTAGRAM_ACCOUNT_ID=...
META_FACEBOOK_PAGE_ID=...

# LinkedIn
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=...

# WhatsApp
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
LORENA_PHONE=521XXXXXXXXXX

# Email
RESEND_API_KEY=...

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=cbc-assets
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
