// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ event: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), settle: vi.fn(), fail: vi.fn() }))
vi.mock('@/lib/stripe', () => ({ getStripe: async () => ({ webhooks: { constructEvent: mocks.event } }) }))
vi.mock('@/lib/integration-secrets', () => ({
  getIntegrationValue: async (key: string) => process.env[key],
  getIntegrationValues: async (keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, process.env[key]])),
}))
vi.mock('@/lib/db', () => ({ db: { payment: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, update: mocks.update } } }))
vi.mock('@/lib/payment-settlement', () => ({ settlePayment: mocks.settle }))
vi.mock('@/lib/fulfillment', () => ({ failSinglePurchase: mocks.fail }))
import { POST } from '@/app/api/webhooks/stripe/route'
const session = { id: 'cs_1', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 100025, currency: 'mxn', metadata: { paymentId: 'p1', orderId: 'o1', type: 'deposit' } }
const req = () => new NextRequest('https://shop.example/api/webhooks/stripe', { method: 'POST', body: '{}', headers: { 'stripe-signature': 'signed' } })
beforeEach(() => {
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture')
  vi.resetAllMocks()
  mocks.event.mockReturnValue({ type: 'checkout.session.completed', data: { object: session } })
  mocks.findUnique.mockResolvedValue({ id: 'p1', provider: 'stripe' })
})
describe('Stripe compatibility', () => {
  it('uses shared settlement with verified amount and provider', async () => {
    expect((await POST(req())).status).toBe(200)
    expect(mocks.settle).toHaveBeenCalledWith('p1', { provider: 'stripe', externalId: 'pi_1', amount: 1000.25, currency: 'mxn' })
  })
  it('does not fulfill an unpaid completed session', async () => {
    mocks.event.mockReturnValue({ type: 'checkout.session.completed', data: { object: { ...session, payment_status: 'unpaid' } } })
    expect((await POST(req())).status).toBe(200)
    expect(mocks.settle).not.toHaveBeenCalled()
  })
  it('settles delayed payment success', async () => {
    mocks.event.mockReturnValue({ type: 'checkout.session.async_payment_succeeded', data: { object: session } })
    await POST(req())
    expect(mocks.settle).toHaveBeenCalledTimes(1)
  })
  it('rejects a bad signature', async () => {
    mocks.event.mockImplementation(() => { throw new Error('bad signature') })
    expect((await POST(req())).status).toBe(400)
    expect(mocks.settle).not.toHaveBeenCalled()
  })
  it('repairs the provider on a legacy B2B record only for its signed Stripe link', async () => {
    mocks.event.mockReturnValue({ type: 'checkout.session.completed', data: { object: { ...session, payment_link: 'plink_1', metadata: { orderId: 'o1', type: 'deposit' } } } })
    mocks.findFirst.mockResolvedValue({ id: 'p1', provider: 'mercadopago', paymentLinkId: 'plink_1' })
    await POST(req())
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { provider: 'stripe' } })
    expect(mocks.settle).toHaveBeenCalledTimes(1)
  })
  it('limits failed retail sessions to their own payment record', async () => {
    mocks.event.mockReturnValue({ type: 'checkout.session.async_payment_failed', data: { object: { ...session, metadata: { paymentId: 'p1', orderId: 'o1', type: 'full' } } } })
    await POST(req())
    expect(mocks.fail).toHaveBeenCalledWith('o1', 'p1')
    expect(mocks.settle).not.toHaveBeenCalled()
  })
})
