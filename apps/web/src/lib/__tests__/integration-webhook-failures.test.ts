// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('@/lib/integration-secrets', () => ({
  getIntegrationValue: async () => { throw new Error('private database or key details') },
  getIntegrationValues: async () => { throw new Error('private database or key details') },
}))
vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/payment-settlement', () => ({}))
vi.mock('@/lib/fulfillment', () => ({}))
vi.mock('@/lib/llm', () => ({}))
import { POST as mercado } from '@/app/api/webhooks/mercadopago/route'
import { POST as stripe } from '@/app/api/webhooks/stripe/route'
import { GET as whatsappVerify, POST as whatsapp } from '@/app/api/webhooks/whatsapp/route'

describe('webhook configuration failures', () => {
  it.each([mercado, stripe, whatsapp])('returns retryable generic errors for configuration outages', async handler => {
    const response = await handler(new NextRequest('https://cbc.example/webhook', { method: 'POST', body: '{}' }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Webhook unavailable' })
  })
  it('also protects the WhatsApp subscription handshake', async () => {
    const response = await whatsappVerify(new NextRequest('https://cbc.example/webhook'))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Webhook unavailable' })
  })
})
