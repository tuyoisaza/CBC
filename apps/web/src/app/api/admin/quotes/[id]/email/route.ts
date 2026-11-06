import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/superadmin'
import { db } from '@/lib/db'
import { sendEmailWithResult } from '@/lib/email'
import { savedQuoteEmail } from '@/lib/saved-quote-email'
import { recordAudit } from '@/lib/audit'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const denied = await requireAdminAccess(session)
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })
  const quote = await db.quote.findUnique({ where: { id: params.id }, include: { customer: true, shippingZone: true, order: { select: { status: true } } } })
  if (!quote) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  if (['Cancelada', 'cancelled', 'rejected'].includes(quote.status) || quote.order?.status === 'cancelled') return NextResponse.json({ error: 'No se puede enviar una cotización cancelada.' }, { status: 409 })
  if (quote.expiresAt && quote.expiresAt < new Date()) return NextResponse.json({ error: 'La cotización venció. Crea una nueva con precios y fechas vigentes.' }, { status: 409 })
  const email = quote.customer.email?.trim()
  if (!z.string().email().safeParse(email).success) return NextResponse.json({ error: 'El cliente no tiene un correo válido registrado.' }, { status: 400 })
  let html: string
  try { html = savedQuoteEmail(quote) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo preparar la cotización.' }, { status: 400 }) }
  const sent = await sendEmailWithResult({ to: email!, subject: `Cotización ${quote.quoteCode.replace(/[\r\n]/g, '')} — Coffee Bunn Café`, html })
  if (!sent.success) {
    const errors = {
      not_configured: 'Falta configurar Brevo o Resend y un remitente verificado en Configuración.',
      configuration_error: 'No se pudo leer la configuración de correo. Revisa Configuración.',
      provider_error: 'El proveedor no pudo enviar el correo. Revisa la clave y el remitente en Configuración.',
    }
    return NextResponse.json({ error: errors[sent.reason] }, { status: sent.reason === 'provider_error' ? 502 : 503 })
  }
  let warning: string | undefined
  try {
    // Preserve order/acceptance states; sending is recorded separately in sentAt.
    await db.quote.update({ where: { id: quote.id }, data: { sentAt: new Date() } })
  } catch { warning = 'El proveedor aceptó el correo, pero no se pudo guardar la fecha del envío. No lo reenvíes sin comprobar tu correo.' }
  await recordAudit({ actorId: session?.user?.id, actorEmail: session?.user?.email }, { action: 'update', entity: 'quote', entityId: quote.id, metadata: { event: 'quote_email_sent', recipientEmail: email } })
  return NextResponse.json({ success: true, email, warning })
}
