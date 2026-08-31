import axios from 'axios'
import { sendEmail } from '@/lib/email'

// ─── Email notifications ──────────────────────────────────────────────────────
// Provider (Brevo or Resend) is resolved in lib/email.ts

const ADMIN_EMAILS = ['contacto@coffeebunncafe.com', 'lorela2114@gmail.com']

async function sendAdminEmail(subject: string, html: string) {
  await sendEmail({ to: ADMIN_EMAILS, subject, html })
}

export async function notifyNewContact(data: {
  companyName: string
  contactName: string
  email: string
  whatsapp: string
  message?: string
}) {
  await sendAdminEmail(
    `🆕 Nuevo contacto — ${data.companyName}`,
    `
    <div style="font-family: sans-serif; max-width: 520px; color: #262626;">
      <h2 style="color: #f7b84e;">Nuevo contacto</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr><td style="padding:8px 0; color:#636363;">Empresa</td><td style="padding:8px 0;"><strong>${data.companyName}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Contacto</td><td style="padding:8px 0;"><strong>${data.contactName}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Email</td><td style="padding:8px 0;"><strong>${data.email}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">WhatsApp</td><td style="padding:8px 0;"><strong>${data.whatsapp}</strong></td></tr>
      </table>
      ${data.message ? `<p style="margin-top:16px; color:#636363;">Mensaje:</p><p style="background:#f5f5f5; padding:12px; border-radius:6px;">${data.message}</p>` : ''}
      <p style="margin-top:24px;"><a href="${process.env.NEXT_PUBLIC_ADMIN_URL}/admin/sales" style="background:#f7b84e; color:#262626; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:700;">Ver en admin</a></p>
    </div>
    `
  )
}

export async function notifyServiceMessage(data: {
  name: string
  email?: string
  phone?: string
  message: string
}) {
  await sendAdminEmail(
    `💬 Mensaje de servicio al cliente — ${data.name}`,
    `
    <div style="font-family: sans-serif; max-width: 520px; color: #262626;">
      <h2 style="color: #f7b84e;">Nuevo mensaje del sitio</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr><td style="padding:8px 0; color:#636363;">Nombre</td><td style="padding:8px 0;"><strong>${data.name}</strong></td></tr>
        ${data.email ? `<tr><td style="padding:8px 0; color:#636363;">Email</td><td style="padding:8px 0;"><strong>${data.email}</strong></td></tr>` : ''}
        ${data.phone ? `<tr><td style="padding:8px 0; color:#636363;">Teléfono</td><td style="padding:8px 0;"><strong>${data.phone}</strong></td></tr>` : ''}
      </table>
      <p style="margin-top:16px; color:#636363;">Mensaje:</p>
      <p style="background:#f5f5f5; padding:12px; border-radius:6px;">${data.message}</p>
      <p style="margin-top:24px;"><a href="${process.env.NEXT_PUBLIC_ADMIN_URL}/admin/service" style="background:#f7b84e; color:#262626; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:700;">Ver en el inbox</a></p>
    </div>
    `
  )
}

export async function notifyNewQuote(data: {
  companyName: string
  contactName: string
  email: string
  whatsapp: string
  total: number
  quoteCode: string
  items: string
}) {
  await sendAdminEmail(
    `📋 Nueva cotización — ${data.companyName} (${data.quoteCode})`,
    `
    <div style="font-family: sans-serif; max-width: 520px; color: #262626;">
      <h2 style="color: #f7b84e;">Nueva cotización</h2>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr><td style="padding:8px 0; color:#636363;">Código</td><td style="padding:8px 0;"><strong>${data.quoteCode}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Empresa</td><td style="padding:8px 0;"><strong>${data.companyName}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Contacto</td><td style="padding:8px 0;"><strong>${data.contactName}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Email</td><td style="padding:8px 0;"><strong>${data.email}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">WhatsApp</td><td style="padding:8px 0;"><strong>${data.whatsapp}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Productos</td><td style="padding:8px 0;"><strong>${data.items}</strong></td></tr>
        <tr><td style="padding:8px 0; color:#636363;">Total</td><td style="padding:8px 0;"><strong>$${data.total.toLocaleString('es-MX')} MXN</strong></td></tr>
      </table>
      <p style="margin-top:24px;"><a href="${process.env.NEXT_PUBLIC_ADMIN_URL}/admin/sales" style="background:#f7b84e; color:#262626; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:700;">Ver en admin</a></p>
    </div>
    `
  )
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
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
    return true
  } catch (err) {
    console.error('WhatsApp send error:', err)
    return false
  }
}

// ─── Speed-to-lead auto-acknowledgment ───────────────────────────────────────
// Replying within 5 minutes multiplies qualification ~21x; Lorena is often
// mid-class or sourcing coffee, so the platform captures that window with an
// instant acknowledgment in her voice. It NEVER quotes prices — the
// consultative close stays human. Returns the message body if the WhatsApp
// send succeeded (so callers can record it as an outbound Message), else null.
export async function sendLeadAutoAck(opts: {
  whatsapp: string
  contactName: string
  companyName?: string
}): Promise<string | null> {
  const firstName = opts.contactName.split(' ')[0]
  const body =
    `Hola ${firstName} 👋 Soy Lorena, de Coffee Bunn Café.\n\n` +
    `Recibí tu solicitud${opts.companyName ? ` para ${opts.companyName}` : ''} — ` +
    `gracias por pensar en nosotros. Hoy mismo te preparo la cotización.\n\n` +
    `Mientras tanto, ¿me cuentas para qué ocasión es el regalo y para cuántas personas? ` +
    `Así elijo mejor el café. ☕`

  const sent = await sendWhatsApp(opts.whatsapp, body)
  return sent ? body : null
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
  type: 'deposit' | 'balance' | 'full'
}) {
  const typeLabel = opts.type === 'deposit' ? 'Anticipo' : opts.type === 'balance' ? 'Saldo final' : 'Compra única'
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
  await sendEmail({
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
}

export async function sendCfdiToCustomer(opts: {
  email: string
  companyName: string
  orderCode: string
  xmlUrl: string
  pdfUrl: string
}) {
  await sendEmail({
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
}

// ─── Customer quote email ────────────────────────────────────────────────────
// Sent right after the cotizador submits. Shows each method/extra with its
// image so the client sees *what* they're getting, plus the authoritative
// price breakdown. Method/extra images are stored as app-relative paths
// (/api/uploads/...), so they're made absolute here for email clients.
export async function sendQuoteToCustomer(opts: {
  email: string
  contactName: string
  companyName: string
  quoteCode: string
  lines: Array<{ name: string; description?: string | null; imageUrl?: string | null; qty: number }>
  subtotal: number
  discount: number
  discountPct: number
  extrasTotal: number
  shippingFee: number
  rushFee: number
  iva: number
  total: number
  advancePct: number
  advanceAmount: number
  deliveryDate?: string | null
}) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const abs = (u?: string | null) =>
    !u ? null : /^https?:\/\//.test(u) ? u : base ? `${base}${u.startsWith('/') ? '' : '/'}${u}` : null
  const money = (n: number) =>
    `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const firstName = opts.contactName.split(' ')[0] || opts.contactName

  const rows = opts.lines
    .map((l) => {
      const img = abs(l.imageUrl)
      return `
        <tr>
          <td style="padding:10px 0; width:56px; vertical-align:top;">
            ${
              img
                ? `<img src="${img}" width="48" height="48" alt="" style="width:48px; height:48px; border-radius:6px; object-fit:cover; border:1px solid #e5e5e5; display:block;" />`
                : `<div style="width:48px; height:48px; border-radius:6px; background:#f0efe9; border:1px solid #e5e5e5;"></div>`
            }
          </td>
          <td style="padding:10px 0 10px 12px; vertical-align:top;">
            <div style="font-size:14px; color:#262626; font-weight:600;">${l.name}</div>
            ${l.description ? `<div style="font-size:12px; color:#636363; margin-top:2px;">${l.description}</div>` : ''}
          </td>
          <td style="padding:10px 0; text-align:right; vertical-align:top; font-size:13px; color:#262626; white-space:nowrap;">
            Cantidad: <strong>${l.qty}</strong>
          </td>
        </tr>`
    })
    .join('')

  const brk = (label: string, value: string, color = '#636363') =>
    `<tr><td style="padding:4px 0; color:${color}; font-size:13px;">${label}</td><td style="padding:4px 0; text-align:right; color:${color}; font-size:13px;">${value}</td></tr>`

  await sendEmail({
    to: opts.email,
    subject: `Tu cotización ${opts.quoteCode} | Coffee Bunn Café`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #262626;">
        <div style="background:#262626; padding:32px; text-align:center;">
          <h1 style="color:#f7b84e; margin:0; font-size:24px;">Coffee Bunn Café</h1>
        </div>
        <div style="padding:32px;">
          <p>Hola <strong>${firstName}</strong>,</p>
          <p>Gracias por cotizar con nosotros${opts.companyName ? ` para <strong>${opts.companyName}</strong>` : ''}. Aquí está el detalle:</p>
          <p style="font-size:13px; color:#636363; margin:0 0 8px;">Folio: <strong style="color:#262626;">${opts.quoteCode}</strong></p>

          <table style="width:100%; border-collapse:collapse; border-top:1px solid #e5e5e5; margin-top:8px;">
            ${rows}
          </table>

          <table style="width:100%; border-collapse:collapse; border-top:1px solid #e5e5e5; margin-top:16px;">
            ${brk('Subtotal', money(opts.subtotal))}
            ${opts.discountPct > 0 ? brk(`Descuento por volumen (${opts.discountPct}%)`, `-${money(opts.discount)}`, '#15803d') : ''}
            ${opts.extrasTotal > 0 ? brk('Extras', money(opts.extrasTotal)) : ''}
            ${brk('Envío', money(opts.shippingFee))}
            ${opts.rushFee > 0 ? brk('Recargo urgente', money(opts.rushFee), '#b45309') : ''}
            ${brk('IVA (16%)', money(opts.iva))}
            <tr><td style="padding:8px 0 0; border-top:1px solid #262626; font-weight:700; font-size:15px;">Total MXN</td><td style="padding:8px 0 0; border-top:1px solid #262626; text-align:right; font-weight:700; font-size:15px;">${money(opts.total)}</td></tr>
            <tr><td style="padding:4px 0; color:#b8860b; font-size:13px;">Anticipo (${opts.advancePct}%)</td><td style="padding:4px 0; text-align:right; color:#b8860b; font-size:13px;">${money(opts.advanceAmount)}</td></tr>
          </table>

          ${opts.deliveryDate ? `<p style="font-size:13px; color:#636363; margin-top:16px;">Fecha de entrega deseada: <strong style="color:#262626;">${opts.deliveryDate}</strong></p>` : ''}

          <p style="color:#636363; font-size:14px; margin-top:24px;">
            Esta cotización es válida por 15 días. Para confirmar tu pedido realiza el anticipo del ${opts.advancePct}% y envíanos tu logo en alta resolución.<br>
            Cualquier duda, escríbenos al +52 55 72293512.
          </p>
        </div>
        <div style="background:#fffaf3; padding:16px 32px; text-align:center; font-size:11px; color:#636363;">
          Coffee Bunn Café · Av. José Martí 300, Escandón II, CDMX 11800
        </div>
      </div>
    `,
  })
}

// ─── Retail single-purchase (storefront) ─────────────────────────────────────

export async function notifyLorenaRetailOrder(opts: {
  orderCode: string
  customerName: string
  amount: number
  shippingCity: string
  isGift: boolean
  giftMessage?: string | null
  recipientName?: string | null
  needsCfdi: boolean
}) {
  const lines = [
    `🛒 *Compra en tienda — ${opts.orderCode}*`,
    `Cliente: ${opts.customerName}`,
    `Monto: $${opts.amount.toLocaleString('es-MX')} MXN`,
    `Envío a: ${opts.shippingCity}`,
  ]
  if (opts.isGift) {
    lines.push(`🎁 Es un regalo${opts.recipientName ? ` — para ${opts.recipientName}` : ''}`)
    if (opts.giftMessage) lines.push(`Mensaje: "${opts.giftMessage}"`)
    lines.push(`(no incluir precio en el paquete)`)
  }
  if (opts.needsCfdi) lines.push(`🧾 Solicita factura`)
  lines.push(``, `Ver pedido: ${process.env.NEXT_PUBLIC_ADMIN_URL}/admin/sales/orders`)

  await sendWhatsApp(process.env.LORENA_PHONE!, lines.join('\n'))
}

export async function sendOrderConfirmationToCustomer(opts: {
  whatsapp: string
  email: string
  name: string
  orderCode: string
  amount: number
  isGift: boolean
}) {
  const trackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tracking/${opts.orderCode}`

  if (opts.whatsapp) {
    await sendWhatsApp(
      opts.whatsapp,
      `¡Gracias por tu compra, ${opts.name}! ☕\n\n` +
        `Pedido *${opts.orderCode}* confirmado por $${opts.amount.toLocaleString('es-MX')} MXN.\n` +
        `Ya lo estamos preparando. Te avisamos cuando salga.\n\n` +
        `Rastrear: ${trackUrl}`,
    )
  }

  if (opts.email) {
    await sendEmail({
      to: opts.email,
      subject: `Pedido ${opts.orderCode} confirmado | Coffee Bunn Café`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #262626;">
          <div style="background: #262626; padding: 32px; text-align: center;">
            <h1 style="color: #f7b84e; margin: 0; font-size: 24px;">Coffee Bunn Café</h1>
          </div>
          <div style="padding: 32px;">
            <p>Hola <strong>${opts.name}</strong>,</p>
            <p>Tu pedido <strong>${opts.orderCode}</strong> está confirmado.</p>
            <p style="font-size: 22px; font-weight: bold; margin: 24px 0 8px;">$${opts.amount.toLocaleString('es-MX')} MXN</p>
            <p>Lo estamos preparando. Te escribiremos por WhatsApp cuando salga a entrega.</p>
            ${opts.isGift ? '<p style="color:#636363; font-size:14px;">Es un regalo: el paquete no incluye el precio.</p>' : ''}
            <p style="margin-top: 24px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/tracking/${opts.orderCode}"
                 style="display: inline-block; background: #f7b84e; color: #262626; padding: 12px 28px; border-radius: 6px; font-weight: 700; text-decoration: none;">
                Rastrear pedido
              </a>
            </p>
            <p style="color: #636363; font-size: 13px; margin-top: 24px;">Cualquier duda, escríbenos al +52 55 72293512.</p>
          </div>
        </div>
      `,
    })
  }
}
