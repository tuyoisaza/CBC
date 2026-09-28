import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmailWithResult } from '@/lib/email'
import { recordAudit } from '@/lib/audit'

export const runtime = 'nodejs'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payment = await db.payment.findUnique({
    where: { id: params.id },
    include: { order: { include: { customer: true, quote: true } } },
  })
  if (!payment) return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 })
  if (!['pending', 'failed'].includes(payment.status) || payment.order.status === 'cancelled' || ['Cancelada', 'cancelled', 'rejected'].includes(payment.order.quote.status)) {
    return NextResponse.json({ error: 'Este pago ya no está pendiente o pertenece a una venta cancelada.' }, { status: 409 })
  }

  const email = payment.order.customer.email?.trim()
  if (!z.string().email().safeParse(email).success) {
    return NextResponse.json({ error: 'El cliente no tiene un correo electrónico válido. Actualízalo antes de enviar.' }, { status: 400 })
  }
  let link: URL
  try {
    link = new URL(payment.paymentLinkUrl || '')
    if (!['https:', 'http:'].includes(link.protocol)) throw new Error('Invalid protocol')
  } catch {
    return NextResponse.json({ error: 'Este pago no tiene un vínculo de pago válido.' }, { status: 400 })
  }

  const customerName = escapeHtml(payment.order.customer.contactName || payment.order.customer.companyName)
  const quoteCode = escapeHtml(payment.order.quote.quoteCode)
  const orderCode = escapeHtml(payment.order.orderCode)
  const paymentType = payment.type === 'deposit' ? 'Anticipo' : payment.type === 'balance' ? 'Saldo' : 'Pago'
  const amount = escapeHtml(payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  const currency = escapeHtml(payment.currency)
  const url = escapeHtml(link.href)
  const sent = await sendEmailWithResult({
    to: email!,
    subject: `Tu vínculo de pago — ${payment.order.quote.quoteCode.replace(/[\r\n]/g, '')}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#262626;line-height:1.6">
      <h2>Coffee Bunn Café</h2>
      <p>Hola ${customerName},</p>
      <p>Gracias por tu cotización. Aquí tienes el vínculo para realizar tu pago y continuar con tu pedido.</p>
      <p><strong>Cotización:</strong> ${quoteCode}<br><strong>Pedido:</strong> ${orderCode}<br><strong>${paymentType}:</strong> $${amount} ${currency}</p>
      <p><a href="${url}" style="display:inline-block;background:#f7b84e;color:#262626;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Realizar pago</a></p>
      <p>También puedes abrir este vínculo: <a href="${url}">${url}</a></p>
      <p>Si tienes alguna pregunta, responde a este correo. Gracias por elegir Coffee Bunn Café.</p>
    </div>`,
  })
  if (!sent.success) {
    const failures = {
      not_configured: { code: 'EMAIL_NOT_CONFIGURED', status: 503, error: 'Falta configurar el proveedor de correo. Configura Brevo o Resend y un remitente verificado en Configuración antes de enviar.' },
      configuration_error: { code: 'EMAIL_CONFIGURATION_ERROR', status: 503, error: 'No se pudo leer la configuración de correo. Revisa la configuración del servidor antes de intentar de nuevo.' },
      provider_error: { code: 'EMAIL_PROVIDER_ERROR', status: 502, error: 'No se pudo enviar el correo mediante el proveedor. Revisa la clave y el remitente verificado en Configuración e intenta de nuevo.' },
    }
    const { status, ...body } = failures[sent.reason]
    return NextResponse.json(body, { status })
  }

  await recordAudit({ actorEmail: session.user?.email }, {
    action: 'update', entity: 'payment', entityId: payment.id,
    metadata: { event: 'payment_link_email_sent', orderId: payment.orderId, recipientEmail: email },
  })
  return NextResponse.json({ success: true, email })
}
