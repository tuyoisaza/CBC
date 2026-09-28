import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ session: vi.fn(), findPayment: vi.fn(), send: vi.fn(), audit: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ db: { payment: { findUnique: mocks.findPayment } } }))
vi.mock('@/lib/email', () => ({ sendEmailWithResult: mocks.send }))
vi.mock('@/lib/audit', () => ({ recordAudit: mocks.audit }))
import { POST } from './route'

function payment() {
  return {
    id: 'payment-1', orderId: 'order-1', status: 'pending', type: 'deposit', amount: 8266.45, currency: 'MXN',
    paymentLinkUrl: 'https://checkout.example/pay?id=one&token=two',
    order: {
      id: 'order-1', orderCode: 'CBC-1', status: 'pending_payment',
      quote: { quoteCode: 'CBC-Q-1', status: 'Pendiente de pago' },
      customer: { email: 'customer@example.com', contactName: 'María', companyName: 'Empresa' },
    },
  }
}

function send(body?: unknown) {
  return POST(new NextRequest('https://cbc.example/api/admin/payments/payment-1/email', {
    method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}),
  }), { params: { id: 'payment-1' } })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  mocks.findPayment.mockResolvedValue(payment())
  mocks.send.mockResolvedValue({ success: true })
})

describe('email saved payment link', () => {
  it('requires an authenticated admin session before reading the payment or sending', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await send()).status).toBe(401)
    expect(mocks.findPayment).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('sends the saved payment to the saved customer, ignoring client overrides, and records success', async () => {
    const response = await send({ to: 'attacker@example.com', paymentLinkUrl: 'https://wrong.example', html: 'Wrong' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, email: 'customer@example.com' })
    expect(mocks.send).toHaveBeenCalledWith({
      to: 'customer@example.com', subject: 'Tu vínculo de pago — CBC-Q-1',
      html: expect.stringContaining('https://checkout.example/pay?id=one&amp;token=two'),
    })
    const html = mocks.send.mock.calls[0][0].html
    for (const text of ['Gracias por tu cotización', 'María', 'CBC-Q-1', 'CBC-1', 'Anticipo', '8,266.45', 'MXN']) expect(html).toContain(text)
    expect(mocks.audit).toHaveBeenCalledWith({ actorEmail: 'admin@example.com' }, {
      action: 'update', entity: 'payment', entityId: 'payment-1',
      metadata: { event: 'payment_link_email_sent', orderId: 'order-1', recipientEmail: 'customer@example.com' },
    })
  })

  it.each([
    ['not_configured', 503, 'EMAIL_NOT_CONFIGURED', 'Falta configurar'],
    ['configuration_error', 503, 'EMAIL_CONFIGURATION_ERROR', 'No se pudo leer'],
    ['provider_error', 502, 'EMAIL_PROVIDER_ERROR', 'mediante el proveedor'],
  ])('reports %s without claiming or auditing successful delivery', async (reason, status, code, message) => {
    mocks.send.mockResolvedValue({ success: false, reason })
    const response = await send()
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ code, error: expect.stringContaining(message as string) })
    expect(mocks.audit).not.toHaveBeenCalled()
  })

  it('returns 404 when the payment no longer exists', async () => {
    mocks.findPayment.mockResolvedValue(null)
    expect((await send()).status).toBe(404)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each(['paid', 'refunded', 'cancelled'])('does not request payment for %s payments', async status => {
    mocks.findPayment.mockResolvedValue({ ...payment(), status })
    expect((await send()).status).toBe(409)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each(['order', 'quote'])('rejects a cancelled %s', async entity => {
    const record = payment()
    if (entity === 'order') record.order.status = 'cancelled'
    else record.order.quote.status = 'Cancelada'
    mocks.findPayment.mockResolvedValue(record)
    expect((await send()).status).toBe(409)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each(['cancelled', 'rejected'])('rejects a legacy %s quote', async status => {
    const record = payment()
    record.order.quote.status = status
    mocks.findPayment.mockResolvedValue(record)
    expect((await send()).status).toBe(409)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each([null, '', 'invalid', 'a@example.com\r\nBcc:other@example.com'])('rejects invalid or missing customer email: %s', async email => {
    const record = payment()
    mocks.findPayment.mockResolvedValue({ ...record, order: { ...record.order, customer: { ...record.order.customer, email } } })
    expect((await send()).status).toBe(400)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it.each([null, '', 'not-a-url', 'javascript:alert(1)', 'data:text/html,test'])('rejects invalid or missing payment links: %s', async paymentLinkUrl => {
    mocks.findPayment.mockResolvedValue({ ...payment(), paymentLinkUrl })
    expect((await send()).status).toBe(400)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('escapes stored customer data and includes the balance amount for a failed payment retry', async () => {
    const record = payment()
    record.status = 'failed'
    record.type = 'balance'
    record.order.customer.contactName = '<img src=x onerror="evil()">'
    record.order.quote.quoteCode = '<script>evil()</script>'
    record.order.orderCode = '<b>order</b>'
    record.currency = '<i>MXN</i>'
    mocks.findPayment.mockResolvedValue(record)
    expect((await send()).status).toBe(200)
    const html = mocks.send.mock.calls[0][0].html
    expect(html).toContain('&lt;img src=x onerror=&quot;evil()&quot;&gt;')
    expect(html).toContain('&lt;script&gt;evil()&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;order&lt;/b&gt;')
    expect(html).toContain('&lt;i&gt;MXN&lt;/i&gt;')
    expect(html).toContain('Saldo')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
  })
})
