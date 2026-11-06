import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/superadmin'
import { db } from '@/lib/db'
import { calculateQuoteForSave, quoteSelectionSchema, QuoteValidationError } from '@/lib/quote-server-calculation'
import { recordAudit } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const denied = await requireAdminAccess(session)
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })
  const parsed = quoteSelectionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los productos, cantidades y entrega.' }, { status: 400 })
  const lead = await db.lead.findUnique({ where: { id: params.id } })
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado.' }, { status: 404 })
  try {
    const calc = await calculateQuoteForSave(db, parsed.data)
    const { extras, extrasTotal, ...saved } = calc
    const quote = await db.$transaction(async tx => {
      const created = await tx.quote.create({ data: {
        ...saved,
        extraItems: extras,
        quoteCode: `CBC-Q-${new Date().getFullYear()}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        leadId: lead.id,
        customerId: lead.customerId,
        status: 'draft',
        expiresAt: new Date(Date.now() + 15 * 86400000),
      } })
      // Do not reopen a lost opportunity or move a confirmed sale backwards.
      await tx.lead.updateMany({ where: { id: lead.id, status: { in: ['new', 'contacted'] } }, data: { status: 'quoted' } })
      return created
    })
    await recordAudit({ actorId: session?.user?.id, actorEmail: session?.user?.email }, { action: 'create', entity: 'quote', entityId: quote.id, metadata: { leadId: lead.id } })
    return NextResponse.json({ quoteId: quote.id, quoteCode: quote.quoteCode }, { status: 201 })
  } catch (error) {
    if (error instanceof QuoteValidationError) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'No se pudo guardar la cotización. Intenta de nuevo.' }, { status: 500 })
  }
}
