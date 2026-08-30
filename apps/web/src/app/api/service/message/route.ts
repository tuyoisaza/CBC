import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateText } from '@/lib/llm'
import { createLogger } from '@/lib/logger'
import { notifyServiceMessage } from '@/lib/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = createLogger('api/service/message')

// Public endpoint — powers the landing-page customer-service widget.
// Creates an inbound Message so it lands in /admin/service exactly like a
// WhatsApp message, with an AI draft reply generated the same way.
const schema = z.object({
  name:    z.string().trim().min(2).max(80),
  email:   z.string().trim().email().max(120).optional().or(z.literal('')),
  phone:   z.string().trim().max(20).optional().or(z.literal('')),
  message: z.string().trim().min(2).max(1000),
  // Honeypot — real users never fill this.
  company: z.string().max(0).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json())
    if (data.company) {
      // Bot filled the honeypot — ack without persisting.
      return NextResponse.json({ success: true })
    }

    const email = data.email || undefined
    const phone = data.phone || undefined
    const from  = email || phone || data.name

    // Best-effort link to an existing customer/lead (by email, then phone).
    const customer = await db.customer.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ whatsapp: { contains: phone.replace(/\D/g, '').slice(-10) } }] : []),
        ],
      },
      include: { leads: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    const body =
      `${data.message}\n\n` +
      `— ${data.name}` +
      (email ? ` · ${email}` : '') +
      (phone ? ` · ${phone}` : '') +
      `\n(vía formulario del sitio)`

    const created = await db.message.create({
      data: {
        from,
        to:        'cbc',
        body,
        direction: 'inbound',
        platform:  'form',
        status:    'unread',
        leadId:    customer?.leads?.[0]?.id,
      },
    })

    // AI draft reply (saved, never auto-sent) — mirrors the WhatsApp webhook.
    generateText({
      maxTokens: 300,
      system:
        `Eres el asistente de ventas de Coffee Bunn Café. Genera un borrador de ` +
        `respuesta breve y cálida en español mexicano para este mensaje enviado ` +
        `desde el formulario de servicio al cliente del sitio. La respuesta es de ` +
        `Lorena Luna, experta en café de especialidad. Tono: amable, directo, ` +
        `profesional. Máximo 3 líneas. Solo el texto, sin comillas.`,
      prompt: `Cliente: ${data.name}\nMensaje: "${data.message}"`,
    })
      .then((aiDraft) =>
        db.message.update({ where: { id: created.id }, data: { aiDraft } }),
      )
      .catch(() => {})

    notifyServiceMessage({
      name: data.name,
      email,
      phone,
      message: data.message,
    }).catch(() => {})

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    log.error({ error: err }, 'Failed to create service message')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
