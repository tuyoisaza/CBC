import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/superadmin'
import { db } from '@/lib/db'
import { recordAudit } from '@/lib/audit'

class MessageConversionError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

const schema = z.object({
  messageId: z.string().min(1).max(100).optional(),
  companyName: z.string().trim().min(2).max(100),
  contactName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(120),
  whatsapp: z.string().trim().regex(/^\+?[0-9]{8,15}$/, 'Usa de 8 a 15 dígitos, con código de país y sin espacios.'),
  boxType: z.enum(['prensa', 'moka', 'mix']),
  quantity: z.number().int().min(1).max(100000),
  occasion: z.enum(['fin-de-ano', 'dia-del-amor', 'dia-del-trabajo', 'onboarding', 'cliente', 'otro']),
  message: z.string().trim().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const denied = await requireAdminAccess(session)
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del formulario.', details: parsed.error.flatten() }, { status: 400 })
  const { companyName, contactName, email, whatsapp, messageId, ...details } = parsed.data
  try {
    const lead = await db.$transaction(async tx => {
      const source = messageId ? await tx.message.findFirst({
        where: { id: messageId, direction: 'inbound', deletedAt: null },
        select: { id: true, platform: true, leadId: true },
      }) : null
      if (messageId && !source) throw new MessageConversionError('El mensaje ya no está disponible.', 404)
      if (source?.leadId) return { id: source.leadId, existing: true }
      // Link the source and create the lead atomically, without changing message/read state.
      const created = await tx.lead.create({
        data: {
          ...details,
          source: source?.platform === 'whatsapp' ? 'whatsapp' : source ? 'service-message' : 'direct',
          status: 'new',
          customer: {
            connectOrCreate: {
              where: { whatsapp },
              create: { companyName, contactName, email, whatsapp, tags: [] },
            },
          },
        },
        select: { id: true },
      })
      if (source) {
        const linked = await tx.message.updateMany({
          where: { id: source.id, direction: 'inbound', deletedAt: null, leadId: null },
          data: { leadId: created.id },
        })
        if (linked.count !== 1) throw new MessageConversionError('El mensaje cambió o ya fue convertido. Vuelve a abrirlo desde Mensajes.', 409)
      }
      return { ...created, existing: false }
    })
    if (!lead.existing) await recordAudit({ actorId: session?.user?.id, actorEmail: session?.user?.email }, {
      action: 'create', entity: 'lead', entityId: lead.id, metadata: messageId ? { event: 'message_converted_to_lead', messageId } : { event: 'manual_lead_created' },
    })
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    if (error instanceof MessageConversionError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'No se pudo guardar el lead. Intenta de nuevo.' }, { status: 500 })
  }
}
