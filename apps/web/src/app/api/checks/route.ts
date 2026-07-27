import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Active endpoint checks.
 *
 * Probes the critical public routes + payment webhooks from inside the
 * container (via 127.0.0.1:$PORT, bypassing Cloudflare) and reports whether
 * each responds with the status we expect. Complements /health, which checks
 * env vars and downstream services (DB, R2, engine).
 *
 * - GET routes expect 200.
 * - The Stripe webhook expects 400 on an unsigned POST — that proves it's
 *   deployed AND actively validating signatures.
 * - The Mercado Pago webhook expects 200 (it acks non-payment events).
 */

type Probe = {
  name: string
  method: 'GET' | 'POST'
  path: string
  expect: number[]
  body?: string
}

const PROBES: Probe[] = [
  { name: 'health (railway)',      method: 'GET',  path: '/api/health',               expect: [200] },
  { name: 'home',                  method: 'GET',  path: '/',                         expect: [200] },
  { name: 'cotizar',               method: 'GET',  path: '/cotizar',                  expect: [200] },
  { name: 'api: methods',          method: 'GET',  path: '/api/methods',              expect: [200] },
  { name: 'api: extras',           method: 'GET',  path: '/api/extras',               expect: [200] },
  { name: 'api: shipping-zones',   method: 'GET',  path: '/api/shipping-zones',       expect: [200] },
  { name: 'api: volume-discounts', method: 'GET',  path: '/api/volume-discounts',     expect: [200] },
  { name: 'api: public settings',  method: 'GET',  path: '/api/settings/public',      expect: [200] },
  { name: 'webhook: stripe',       method: 'POST', path: '/api/webhooks/stripe',      expect: [400], body: '{}' },
  { name: 'webhook: mercadopago',  method: 'POST', path: '/api/webhooks/mercadopago', expect: [200], body: '{}' },
]

function baseUrl(): string {
  const port = process.env.PORT || '3000'
  return `http://127.0.0.1:${port}`
}

export async function GET() {
  const base = baseUrl()
  const startedAt = Date.now()

  const checks = await Promise.all(
    PROBES.map(async (p) => {
      const t0 = Date.now()
      try {
        const res = await fetch(`${base}${p.path}`, {
          method: p.method,
          headers: p.body ? { 'content-type': 'application/json' } : undefined,
          body: p.body,
          redirect: 'manual',
          signal: AbortSignal.timeout(8000),
        })
        return {
          name: p.name,
          method: p.method,
          path: p.path,
          expected: p.expect,
          status: res.status,
          ok: p.expect.includes(res.status),
          latency_ms: Date.now() - t0,
        }
      } catch (e) {
        return {
          name: p.name,
          method: p.method,
          path: p.path,
          expected: p.expect,
          status: null,
          ok: false,
          latency_ms: Date.now() - t0,
          error: (e as Error).message,
        }
      }
    }),
  )

  const failed = checks.filter((c) => !c.ok)
  const overall = failed.length === 0 ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      status: overall,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '?',
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - startedAt,
      passed: checks.length - failed.length,
      total: checks.length,
      checks,
    },
    { status: overall === 'ok' ? 200 : 503 },
  )
}
