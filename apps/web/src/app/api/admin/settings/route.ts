import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { requireAdminAccess } from '@/lib/superadmin'

// This legacy endpoint only stores non-secret business configuration. Credentials
// and bootstrap/auth settings belong exclusively to the protected vendor vault.
const BUSINESS_KEYS = [
  'site_logo_url', 'logo_size', 'logo_alignment', 'logo_link',
  'single_purchase_markup', 'wholesale_markup_pct', 'retail_shipping_cost', 'retail_free_shipping_threshold',
  'payments_single_providers', 'payments_b2b_provider', 'payments_oxxo_enabled', 'payments_msi_enabled',
  'MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD', 'IVA_PCT',
] as const

const schema = z.object({
  key: z.enum(BUSINESS_KEYS),
  value: z.string().max(10000),
}).strict()

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const guard = await requireAdminAccess(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Unsupported business setting' }, { status: 400 })
  const { key, value } = parsed.data
  const current = await db.setting.findUnique({ where: { key } })
  if (current?.encrypted) return NextResponse.json({ error: 'Protected setting' }, { status: 403 })

  await db.setting.upsert({
    where:  { key },
    update: { value, encrypted: false },
    create: { key, value, encrypted: false },
  })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const guard = await requireAdminAccess(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const url = new URL(req.url)
  const key = url.searchParams.get('key')

  if (key) {
    if (!BUSINESS_KEYS.some(allowed => allowed === key)) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    const setting = await db.setting.findUnique({ where: { key } })
    if (setting?.encrypted) return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    return NextResponse.json(setting)
  }

  const settings = await db.setting.findMany({ where: { key: { in: [...BUSINESS_KEYS] }, encrypted: false } })
  return NextResponse.json(settings)
}
