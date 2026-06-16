# Cotizador Configurable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Replace WhatsApp CTA with a full configurable quoter (product/method selection, extras, shipping, rush, auto-price), with admin CRUDs for methods, extras, shipping zones, and volume discounts.

**Architecture:** New Prisma models (Method, Extra, ShippingZone, VolumeDiscount), expand Quote with configuration fields, public wizard at `/cotizar` with steps, public API for calculation/submission, admin CRUDs following existing ProductForm pattern.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL, Zod validation, Server Components + Client Components

---

## File Map

### Schema / DB
| File | Action |
|------|--------|
| `packages/db/schema.prisma` | Add 4 models (Method, Extra, ShippingZone, VolumeDiscount); update Product (add methodId); expand Quote |
| `packages/db/migrations/20260615000001_cotizador_config` | New migration |
| `packages/db/seed.ts` | Seed initial methods, zones, settings |

### API Routes — Public
| File | Action |
|------|--------|
| `apps/web/src/app/api/methods/route.ts` | Create — GET list |
| `apps/web/src/app/api/extras/route.ts` | Create — GET list |
| `apps/web/src/app/api/shipping-zones/route.ts` | Create — GET list |
| `apps/web/src/app/api/volume-discounts/route.ts` | Create — GET list |
| `apps/web/src/app/api/settings/public/route.ts` | Create — GET public settings |
| `apps/web/src/app/api/quote/calculate/route.ts` | Create — POST price calculation |
| `apps/web/src/app/api/quote/submit/route.ts` | Create — POST create Lead + Quote |

### API Routes — Admin CRUD
| File | Action |
|------|--------|
| `apps/web/src/app/api/admin/methods/route.ts` | Create — GET/POST |
| `apps/web/src/app/api/admin/methods/[id]/route.ts` | Create — PATCH/DELETE |
| `apps/web/src/app/api/admin/extras/route.ts` | Create — GET/POST |
| `apps/web/src/app/api/admin/extras/[id]/route.ts` | Create — PATCH/DELETE |
| `apps/web/src/app/api/admin/shipping-zones/route.ts` | Create — GET/POST |
| `apps/web/src/app/api/admin/shipping-zones/[id]/route.ts` | Create — PATCH/DELETE |
| `apps/web/src/app/api/admin/volume-discounts/route.ts` | Create — GET/POST |
| `apps/web/src/app/api/admin/volume-discounts/[id]/route.ts` | Create — PATCH/DELETE |

### Admin Pages
| File | Action |
|------|--------|
| `apps/web/src/app/admin/(protected)/sales/methods/page.tsx` | Create — list |
| `apps/web/src/app/admin/(protected)/sales/methods/new/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/methods/[id]/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/extras/page.tsx` | Create — list |
| `apps/web/src/app/admin/(protected)/sales/extras/new/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/extras/[id]/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/shipping-zones/page.tsx` | Create — list |
| `apps/web/src/app/admin/(protected)/sales/shipping-zones/new/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/shipping-zones/[id]/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/volume-discounts/page.tsx` | Create — list |
| `apps/web/src/app/admin/(protected)/sales/volume-discounts/new/page.tsx` | Create — form |
| `apps/web/src/app/admin/(protected)/sales/volume-discounts/[id]/page.tsx` | Create — form |

### Admin Nav
| File | Action |
|------|--------|
| `apps/web/src/components/admin/AdminNav.tsx` | Modify — add links to new CRUDs under "Ventas" |

### Components
| File | Action |
|------|--------|
| `apps/web/src/components/admin/sales/SimpleForm.tsx` | Create — reusable inline create/edit form for simple entities |
| `apps/web/src/app/cotizar/components/CotizadorWizard.tsx` | Create — multi-step wizard container |
| `apps/web/src/app/cotizar/actions/submitQuote.ts` | Create — server action to call /api/quote/submit |

### Public Pages
| File | Action |
|------|--------|
| `apps/web/src/app/cotizar/page.tsx` | Rewrite — replace lead form with wizard |
| `apps/web/src/app/contacto/page.tsx` | Create — simplified contact form (moved from old /cotizar) |
| `apps/web/src/app/page.tsx` | Modify — replace "Cotizar por WhatsApp" → "Cotizar" |
| `apps/web/src/app/productos/[slug]/page.tsx` | Modify — replace WA_URL CTA with link to /cotizar |
| `apps/web/src/components/public/PublicFooter.tsx` | Modify — replace WhatsApp link → /cotizar |
| `apps/web/src/app/en/cotizar/page.tsx` | Rewrite — replace with English wizard |
| `apps/web/src/app/en/contacto/page.tsx` | Create — English contact form |
| `apps/web/src/app/en/page.tsx` | Modify — replace WA_URL |

---

### Task 1: Schema, Migration, Seed

**Files:**
- Modify: `packages/db/schema.prisma`
- Create: `packages/db/migrations/20260615000001_cotizador_config/migration.sql`
- Modify: `packages/db/seed.ts`

Also add `@unique` to `whatsapp` on the Customer model (for upsert in submit).

- [ ] **Add 4 new models to schema.prisma**

Insert after Product model:

```prisma
// ─── Quoter Config ────────────────────────────────────────────────────

model Method {
  id          String   @id @default(cuid())
  name        String
  description String?
  unitPrice   Float
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Extra {
  id          String   @id @default(cuid())
  name        String
  description String?
  unitPrice   Float
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ShippingZone {
  id          String   @id @default(cuid())
  name        String
  baseFee     Float
  feePerUnit  Float
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model VolumeDiscount {
  id          String   @id @default(cuid())
  minQty      Int
  maxQty      Int?
  discountPct Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Update Product model — add methodId**

Add to Product model:
```prisma
  methodId    String?
  method      Method?  @relation(fields: [methodId], references: [id])
```

- [ ] **Update Quote model — expand fields**

Add to Quote model:
```prisma
  extraItems    Json         @default("[]")
  shippingZone  ShippingZone? @relation(fields: [shippingZoneId], references: [id])
  shippingZoneId String?
  deliveryDate  DateTime?
  rush          Boolean      @default(false)
  discount      Float        @default(0)
  discountPct   Float        @default(0)
  shippingFee   Float        @default(0)
  rushFee       Float        @default(0)
  advancePct    Float        @default(50)
  advanceAmount Float        @default(0)
```

Also update Quote.status comment to reflect new states.

- [ ] **Build DB package to generate migration**

Run:
```bash
pnpm --filter @cbc/db build
```

This generates the migration SQL.

- [ ] **Write migration SQL**

Read the generated migration and ensure it includes:
- CREATE TABLE for Method, Extra, ShippingZone, VolumeDiscount
- ALTER TABLE Product ADD COLUMN methodId
- ALTER TABLE Quote ADD COLUMNS for expanded fields

- [ ] **Update seed.ts**

Add seed data:
```typescript
// Methods
const methods: { name: string; unitPrice: number }[] = [
  { name: 'Prensa Francesa', unitPrice: 799 },
  { name: 'Moka Italiana', unitPrice: 849 },
]

// Extras  
const extras: { name: string; unitPrice: number }[] = [
  { name: 'Tapografía', unitPrice: 50 },
  { name: 'Personalización de caja', unitPrice: 120 },
  { name: 'Tarjeta de mensaje', unitPrice: 35 },
  { name: 'QR + curso personalizado', unitPrice: 200 },
]

// Shipping Zones
const zones: { name: string; baseFee: number; feePerUnit: number }[] = [
  { name: 'CDMX / Área Metropolitana', baseFee: 0, feePerUnit: 15 },
  { name: 'Interior del país', baseFee: 150, feePerUnit: 25 },
  { name: 'Recolección (sin envío)', baseFee: 0, feePerUnit: 0 },
]

// Volume Discounts
const discounts: { minQty: number; maxQty: number | null; discountPct: number }[] = [
  { minQty: 10, maxQty: 20, discountPct: 5 },
  { minQty: 21, maxQty: 50, discountPct: 10 },
  { minQty: 51, maxQty: null, discountPct: 15 },
]

// Settings
const settings: { key: string; value: string }[] = [
  { key: 'MIN_PRODUCTION_DAYS', value: '15' },
  { key: 'RUSH_DAYS_THRESHOLD', value: '8' },
  { key: 'RUSH_FEE_PCT', value: '40' },
  { key: 'ADVANCE_PCT', value: '50' },
  { key: 'MIN_QTY_PER_METHOD', value: '10' },
]
```

Link existing Product boxes to methods by name matching.

- [ ] **Commit**

```bash
git add packages/db/ && git commit -m "v1.3.0 feat: add quoter config models (Method, Extra, ShippingZone, VolumeDiscount)"
```

---

### Task 2: Public API — GET endpoints

**Files:**
- Create: `apps/web/src/app/api/methods/route.ts`
- Create: `apps/web/src/app/api/extras/route.ts`
- Create: `apps/web/src/app/api/shipping-zones/route.ts`
- Create: `apps/web/src/app/api/volume-discounts/route.ts`
- Create: `apps/web/src/app/api/settings/public/route.ts`

- [ ] **Create GET /api/methods**

```typescript
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const methods = await db.method.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(methods)
}
```

- [ ] **Create GET /api/extras**

Same pattern: findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })

- [ ] **Create GET /api/shipping-zones**

Same pattern: findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })

- [ ] **Create GET /api/volume-discounts**

```typescript
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const discounts = await db.volumeDiscount.findMany({
    orderBy: { minQty: 'asc' },
  })
  return NextResponse.json(discounts)
}
```

- [ ] **Create GET /api/settings/public**

```typescript
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const PUBLIC_KEYS = ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD']

export async function GET() {
  const settings = await db.setting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  })
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  return NextResponse.json(map)
}
```

- [ ] **Commit**

```bash
git add apps/web/src/app/api/methods/ apps/web/src/app/api/extras/ apps/web/src/app/api/shipping-zones/ apps/web/src/app/api/volume-discounts/ apps/web/src/app/api/settings/ && git commit -m "v1.3.0 feat: add public GET APIs for methods, extras, zones, discounts, settings"
```

---

### Task 3: API — POST /api/quote/calculate

**Files:**
- Create: `apps/web/src/app/api/quote/calculate/route.ts`

- [ ] **Create calculate route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const calcSchema = z.object({
  items: z.array(z.object({
    methodId: z.string(),
    qty: z.number().int().positive(),
  })),
  extras: z.array(z.object({
    extraId: z.string(),
    qty: z.number().int().positive().default(1),
  })).optional().default([]),
  shippingZoneId: z.string(),
  rush: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = calcSchema.parse(body)

  // Fetch all needed data in parallel
  const [methods, extras, zone, discounts, settings] = await Promise.all([
    db.method.findMany({ where: { id: { in: parsed.items.map(i => i.methodId) } } }),
    db.extra.findMany({ where: { id: { in: parsed.extras.map(e => e.extraId) } } }),
    db.shippingZone.findUnique({ where: { id: parsed.shippingZoneId } }),
    db.volumeDiscount.findMany({ orderBy: { minQty: 'asc' } }),
    db.setting.findMany({ where: { key: { in: ['RUSH_FEE_PCT', 'ADVANCE_PCT'] } } }),
  ])

  if (!zone) return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })

  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

  // Calculate line totals
  const subtotal = parsed.items.reduce((sum, item) => {
    const method = methods.find(m => m.id === item.methodId)
    if (!method) return sum
    return sum + method.unitPrice * item.qty
  }, 0)

  // Volume discount
  const totalUnits = parsed.items.reduce((sum, i) => sum + i.qty, 0)
  const discountTier = [...discounts].reverse().find(d => d.minQty <= totalUnits && (d.maxQty === null || d.maxQty >= totalUnits))
  const discountPct = discountTier?.discountPct ?? 0
  const discount = subtotal * (discountPct / 100)

  // Extras
  const extrasTotal = parsed.extras.reduce((sum, item) => {
    const extra = extras.find(e => e.id === item.extraId)
    if (!extra) return sum
    return sum + extra.unitPrice * item.qty
  }, 0)

  // Shipping
  const shippingFee = zone.baseFee + zone.feePerUnit * totalUnits

  // Rush fee
  const rushFeePct = Number(settingsMap['RUSH_FEE_PCT'] ?? 40)
  const rushFee = parsed.rush ? (subtotal - discount) * (rushFeePct / 100) : 0

  // IVA
  const afterDiscount = subtotal - discount + extrasTotal + shippingFee + rushFee
  const iva = afterDiscount * 0.16
  const total = afterDiscount + iva

  // Advance
  const advancePct = Number(settingsMap['ADVANCE_PCT'] ?? 50)
  const advanceAmount = total * (advancePct / 100)

  return NextResponse.json({
    subtotal,
    discount,
    discountPct,
    extrasTotal,
    shippingFee,
    rushFee,
    iva,
    total,
    advancePct,
    advanceAmount,
  })
}
```

- [ ] **Commit**

```bash
git add apps/web/src/app/api/quote/ && git commit -m "v1.3.0 feat: add POST /api/quote/calculate with full price logic"
```

---

### Task 4: API — POST /api/quote/submit

**Files:**
- Create: `apps/web/src/app/api/quote/submit/route.ts`

- [ ] **Create submit route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const submitSchema = z.object({
  // Contact
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(8),
  // Quote config
  items: z.array(z.object({ methodId: z.string(), methodName: z.string(), qty: z.number().int().positive(), unitPrice: z.number(), lineTotal: z.number() })),
  extras: z.array(z.object({ extraId: z.string(), name: z.string(), qty: z.number().int().positive(), unitPrice: z.number(), lineTotal: z.number() })).optional().default([]),
  shippingZoneId: z.string(),
  deliveryDate: z.string().optional(),
  rush: z.boolean().default(false),
  // Calculated totals (from /api/quote/calculate, re-validated server-side)
  subtotal: z.number(),
  discount: z.number(),
  discountPct: z.number(),
  extrasTotal: z.number().optional().default(0),
  shippingFee: z.number(),
  rushFee: z.number(),
  iva: z.number(),
  total: z.number(),
  advancePct: z.number(),
  advanceAmount: z.number(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = submitSchema.parse(body)

  // Upsert customer by whatsapp
  const customer = await db.customer.upsert({
    where: { whatsapp: parsed.whatsapp },
    update: { companyName: parsed.companyName, contactName: parsed.contactName, email: parsed.email },
    create: { companyName: parsed.companyName, contactName: parsed.contactName, email: parsed.email, whatsapp: parsed.whatsapp },
  })

  // Create lead
  const lead = await db.lead.create({
    data: {
      customerId: customer.id,
      source: 'cotizador',
      status: 'new',
    },
  })

  // Create quote
  const quote = await db.quote.create({
    data: {
      quoteCode: `CBC-Q-${new Date().getFullYear()}-${String(await db.quote.count() + 1).padStart(3, '0')}`,
      leadId: lead.id,
      customerId: customer.id,
      items: parsed.items,
      extraItems: parsed.extras,
      shippingZoneId: parsed.shippingZoneId,
      deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : null,
      rush: parsed.rush,
      subtotal: parsed.subtotal,
      discount: parsed.discount,
      discountPct: parsed.discountPct,
      shippingFee: parsed.shippingFee,
      rushFee: parsed.rushFee,
      iva: parsed.iva,
      total: parsed.total,
      advancePct: parsed.advancePct,
      advanceAmount: parsed.advanceAmount,
      status: 'Cotización creada',
    },
  })

  return NextResponse.json({ success: true, quoteId: quote.id })
}
```

The Customer model needs `whatsapp String? @unique` for this upsert to work. Add `@unique` to `whatsapp` in the schema during Task 1.

- [ ] **Commit**

```bash
git add apps/web/src/app/api/quote/submit/ && git commit -m "v1.3.0 feat: add POST /api/quote/submit to create Lead + Quote"
```

---

### Task 5: Admin CRUD APIs

**Files:**
- Create: 8 route files for CRUD operations on Method, Extra, ShippingZone, VolumeDiscount

- [ ] **Create admin/methods/route.ts** — GET list + POST create (auth guard + Zod validation)
- [ ] **Create admin/methods/[id]/route.ts** — PATCH update + DELETE
- [ ] **Create admin/extras/route.ts** — same pattern
- [ ] **Create admin/extras/[id]/route.ts** — same pattern
- [ ] **Create admin/shipping-zones/route.ts** — same pattern
- [ ] **Create admin/shipping-zones/[id]/route.ts** — same pattern
- [ ] **Create admin/volume-discounts/route.ts** — same pattern
- [ ] **Create admin/volume-discounts/[id]/route.ts** — same pattern

Each follows the pattern from `apps/web/src/app/api/admin/products/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1), ... })

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await db.method.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data = schema.parse(body)
  const item = await db.method.create({ data })
  return NextResponse.json(item, { status: 201 })
}
```

- [ ] **Commit**

```bash
git add apps/web/src/app/api/admin/methods/ apps/web/src/app/api/admin/extras/ apps/web/src/app/api/admin/shipping-zones/ apps/web/src/app/api/admin/volume-discounts/ && git commit -m "v1.3.0 feat: add admin CRUD APIs for methods, extras, zones, discounts"
```

---

### Task 6: Admin CRUD Pages

**Files:**
- List pages for each entity
- New/[id] pages for each entity
- `apps/web/src/components/admin/sales/SimpleForm.tsx` — reusable form component

- [ ] **Create SimpleForm component**

A generic client component for simple entity CRUDs (methods, extras, zones, discounts):

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Field {
  name: string
  label: string
  type: 'text' | 'number' | 'textarea'
  required?: boolean
  min?: number
  step?: string
}

interface SimpleFormProps {
  title: string
  backUrl: string
  fields: Field[]
  initialData?: Record<string, any>
  saveUrl: string
}

export function SimpleForm({ title, backUrl, fields, initialData, saveUrl }: SimpleFormProps) {
  const router = useRouter()
  const isEditing = !!initialData
  const [form, setForm] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {}
    for (const f of fields) {
      initial[f.name] = initialData?.[f.name] ?? (f.type === 'number' ? 0 : '')
    }
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(saveUrl, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      router.push(backUrl)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href={backUrl} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                required={f.required} className="input-field resize-y" rows={3} />
            ) : (
              <input type={f.type} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                required={f.required} min={f.min} step={f.step} className="input-field" />
            )}
          </div>
        ))}
      </div>

      <button type="submit" disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {saving ? 'Guardando...' : <Check className="h-4 w-4" />}
        {isEditing ? 'Guardar cambios' : 'Crear'}
      </button>
    </form>
  )
}
```

- [ ] **Create list + form pages for Methods**
- [ ] **Create list + form pages for Extras**
- [ ] **Create list + form pages for Shipping Zones**
- [ ] **Create list + form pages for Volume Discounts**

Each entity: list page (table with edit link) + new/[id] page (inline form). Follow pattern from `apps/web/src/app/admin/(protected)/sales/products/page.tsx`.

- [ ] **Commit**

```bash
git add apps/web/src/components/admin/sales/SimpleForm.tsx apps/web/src/app/admin/\(protected\)/sales/methods/ apps/web/src/app/admin/\(protected\)/sales/extras/ apps/web/src/app/admin/\(protected\)/sales/shipping-zones/ apps/web/src/app/admin/\(protected\)/sales/volume-discounts/ && git commit -m "v1.3.0 feat: add admin CRUD pages for methods, extras, zones, discounts"
```

---

### Task 7: Update Product Form + Admin Nav

Nota: Admin de quotes (listado con campos expandidos) no existe aún (directorio vacío). Se pospone para iteración futura.

**Files:**
- Modify: `apps/web/src/components/admin/sales/ProductForm.tsx`
- Modify: `apps/web/src/components/admin/AdminNav.tsx`

- [ ] **Add method selector to ProductForm**

After price field or in a new section, add a dropdown to select a Method (optional). Fetch methods from `/api/admin/methods` (or pass them from server component).

- [ ] **Add admin nav links**

In AdminNav.tsx, under "Ventas" section, add links:
```
Métodos → /admin/sales/methods
Extras → /admin/sales/extras
Zonas de envío → /admin/sales/shipping-zones
Descuentos → /admin/sales/volume-discounts
```

- [ ] **Commit**

```bash
git add apps/web/src/components/admin/sales/ProductForm.tsx apps/web/src/components/admin/AdminNav.tsx && git commit -m "v1.3.0 feat: add method selector to ProductForm, admin nav links"
```

---

### Task 8: Cotizador Frontend

**Files:**
- Rewrite: `apps/web/src/app/cotizar/page.tsx`
- Create: `apps/web/src/app/cotizar/components/CotizadorWizard.tsx`
- Create: `apps/web/src/app/cotizar/actions/submitQuote.ts`

- [ ] **Create the CotizadorWizard component**

A `'use client'` component that manages the multi-step flow:

1. **Product/Method selection** — show predefined boxes (products) and option to "Armar pedido" with method picker + quantity (min 10 each)
2. **Extras** — checkboxes for tapografía, personalización caja, tarjeta, QR+curso (each with qty)
3. **Delivery** — shipping zone selector, date picker, rush toggle
4. **Summary + Contact** — price breakdown + form (companyName, contactName, email, whatsapp)
5. **Confirmation** — success message with quote ID

State management via React hooks (useState/useReducer). Price recalculation by calling `/api/quote/calculate` when selections change.

- [ ] **Rewrite /cotizar/page.tsx**

Server component that fetches methods, extras, zones, discounts, settings, and products. Checks for `?product=slug` query param for preselect. Renders the CotizadorWizard client component with initial data.

- [ ] **Create submitQuote server action**

Server action in `actions/submitQuote.ts` that calls `/api/quote/submit` (or directly creates via db).

- [ ] **Commit**

```bash
git add apps/web/src/app/cotizar/ && git commit -m "v1.3.0 feat: add configurable quoter wizard"
```

---

### Task 9: Button Replacements + Contact Page

**Files:**
- Create: `apps/web/src/app/contacto/page.tsx`
- Create: `apps/web/src/app/en/contacto/page.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/en/page.tsx`
- Modify: `apps/web/src/app/productos/[slug]/page.tsx`
- Modify: `apps/web/src/components/public/PublicFooter.tsx`
- Modify: `apps/web/src/app/en/cotizar/page.tsx` (optional — redirect to ES or duplicate wizard)

- [ ] **Replace all "Cotizar por WhatsApp" → "Cotizar"**

In `page.tsx` (home), `productos/[slug]/page.tsx`, `PublicFooter.tsx`:
- Replace button text "Cotizar por WhatsApp" → "Cotizar"
- Replace `WA_URL` href → `/cotizar` or `/cotizar?product=${product.slug}`
- Remove the `WA_URL` constant where no longer needed

- [ ] **Create /contacto page**

Move the existing lead form from /cotizar to /contacto (simplified: just name, email, whatsapp, message). Keep `/api/leads` endpoint.

- [ ] **Handle /en/contacto**

Same but in English.

- [ ] **Commit**

```bash
git add apps/web/src/app/contacto/ apps/web/src/app/en/contacto/ apps/web/src/app/page.tsx apps/web/src/app/en/page.tsx apps/web/src/app/productos/ apps/web/src/components/public/ && git commit -m "v1.3.0 feat: replace WhatsApp CTAs with quoter links, add /contacto page"
```

---

### Task 10: Build Verification

- [ ] **Build DB and web**

```bash
pnpm --filter @cbc/db build && pnpm --filter @cbc/web build
```

- [ ] **Fix any type/build errors**
- [ ] **Commit fixes if needed**
- [ ] **Push to trigger Railway deploy**

---

## Build Verification

After all tasks, run:
```bash
pnpm --filter @cbc/db build
pnpm --filter @cbc/web build
```
