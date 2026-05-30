import axios from 'axios'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── WhatsApp ────────────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, message: string) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // strip non-digits
        type: 'text',
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    )
  } catch (err) {
    console.error('WhatsApp send error:', err)
  }
}

// ─── Lorena alerts ───────────────────────────────────────────────────────────

export async function notifyLorenaNewLead(lead: {
  companyName: string
  contactName: string
  whatsapp: string
  boxType: string
  quantity: number
}) {
  const msg =
    `🆕 *Nuevo lead CBC*\n` +
    `Empresa: ${lead.companyName}\n` +
    `Contacto: ${lead.contactName}\n` +
    `WhatsApp: ${lead.whatsapp}\n` +
    `Caja: ${lead.boxType} × ${lead.quantity}\n\n` +
    `Ver en admin: ${process.env.NEXT_PUBLIC_ADMIN_URL}/admin/sales`

  await sendWhatsApp(process.env.LORENA_PHONE!, msg)
}

export async function notifyLorenaPayment(opts: {
  companyName: string
  orderCode: string
  amount: number
  type: 'deposit' | 'balance'
}) {
  const typeLabel = opts.type === 'deposit' ? 'Anticipo' : 'Saldo final'
  const msg =
    `💰 *Pago recibido — ${typeLabel}*\n` +
    `Empresa: ${opts.companyName}\n` +
    `Pedido: ${opts.orderCode}\n` +
    `Monto: $${opts.amount.toLocaleString('es-MX')} MXN\n\n` +
    `Ver pedido: ${process.env.NEXT_PUBLIC_ADMIN_URL}/admin/sales/orders`

  await sendWhatsApp(process.env.LORENA_PHONE!, msg)
}

// ─── Customer notifications ───────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, (orderCode: string) => string> = {
  confirmed:     (c) => `✅ Tu pedido *${c}* está confirmado. ¡Empezamos a prepararlo pronto!`,
  in_production: (c) => `☕ Tu pedido *${c}* está en producción. Lorena está seleccionando el café.`,
  ready:         (c) => `📦 Tu pedido *${c}* está listo y se enviará pronto.`,
  shipped:       (c) => `🚚 Tu pedido *${c}* está en camino. Te avisamos cuando llegue.`,
  delivered:     (c) => `🎉 Tu pedido *${c}* fue entregado. ¡Disfruten el café!`,
}

export async function notifyCustomerOrderStatus(opts: {
  whatsapp: string
  orderCode: string
  status: string
  trackingNumber?: string
}) {
  const getMessage = STATUS_MESSAGES[opts.status]
  if (!getMessage) return

  let msg = getMessage(opts.orderCode)

  if (opts.status === 'shipped' && opts.trackingNumber) {
    msg += `\nNúmero de rastreo: *${opts.trackingNumber}*`
  }

  msg += `\n\nRastrear pedido: ${process.env.NEXT_PUBLIC_APP_URL}/seguimiento/${opts.orderCode}`

  await sendWhatsApp(opts.whatsapp, msg)
}

export async function sendPaymentLinkToCustomer(opts: {
  whatsapp: string
  email: string
  companyName: string
  orderCode: string
  amount: number
  type: 'deposit' | 'balance'
  paymentUrl: string
}) {
  const typeLabel = opts.type === 'deposit' ? 'anticipo (50%)' : 'saldo final (50%)'
  const msg =
    `Hola ${opts.companyName} 👋\n\n` +
    `Aquí está el link de pago para el ${typeLabel} de tu pedido *${opts.orderCode}*:\n\n` +
    `💳 *$${opts.amount.toLocaleString('es-MX')} MXN*\n` +
    `${opts.paymentUrl}\n\n` +
    `El link acepta tarjeta de crédito/débito y OXXO Pay.\n` +
    `Cualquier duda, estamos aquí. ☕`

  await sendWhatsApp(opts.whatsapp, msg)

  // Also send email
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: opts.email,
      subject: `Link de pago — Pedido ${opts.orderCode} | Coffee Bunn Café`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #262626;">
          <div style="background: #262626; padding: 32px; text-align: center;">
            <h1 style="color: #f7b84e; margin: 0; font-size: 24px;">Coffee Bunn Café</h1>
          </div>
          <div style="padding: 32px;">
            <p>Hola <strong>${opts.companyName}</strong>,</p>
            <p>Aquí está el link de pago para el <strong>${typeLabel}</strong> de tu pedido <strong>${opts.orderCode}</strong>:</p>
            <div style="text-align: center; margin: 32px 0;">
              <p style="font-size: 28px; font-weight: bold; color: #262626; margin: 0;">
                $${opts.amount.toLocaleString('es-MX')} MXN
              </p>
              <a href="${opts.paymentUrl}"
                 style="display: inline-block; margin-top: 16px; background: #f7b84e; color: #262626;
                        padding: 14px 32px; border-radius: 6px; font-weight: 700; text-decoration: none;">
                Pagar ahora
              </a>
            </div>
            <p style="color: #636363; font-size: 14px;">
              El link acepta tarjeta de crédito/débito y OXXO Pay.<br>
              Cualquier duda, escríbenos al +52 55 72293512.
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email send error:', err)
  }
}

export async function sendCfdiToCustomer(opts: {
  email: string
  companyName: string
  orderCode: string
  xmlUrl: string
  pdfUrl: string
}) {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: opts.email,
      subject: `Factura CFDI — Pedido ${opts.orderCode} | Coffee Bunn Café`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #262626;">
          <div style="background: #262626; padding: 32px; text-align: center;">
            <h1 style="color: #f7b84e; margin: 0; font-size: 24px;">Coffee Bunn Café</h1>
          </div>
          <div style="padding: 32px;">
            <p>Hola <strong>${opts.companyName}</strong>,</p>
            <p>Adjuntamos la factura CFDI de tu pedido <strong>${opts.orderCode}</strong>.</p>
            <p>
              <a href="${opts.pdfUrl}">📄 Descargar PDF</a><br>
              <a href="${opts.xmlUrl}">📋 Descargar XML</a>
            </p>
            <p style="color: #636363; font-size: 14px;">
              Esta factura tiene validez fiscal ante el SAT.<br>
              Si necesitas alguna corrección, contáctanos a la brevedad.
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('CFDI email error:', err)
  }
}
