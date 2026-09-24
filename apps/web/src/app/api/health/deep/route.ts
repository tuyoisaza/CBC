import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIntegrationValues } from '@/lib/integration-secrets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CheckResult = { status: 'ok' | 'error' | 'not_configured'; latency_ms: number; message?: string }

async function checkPrisma(timeoutMs = 3000): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('database ping timed out')), timeoutMs),
      ),
    ])
    return { status: 'ok', latency_ms: Date.now() - t0 }
  } catch (e) {
    return { status: 'error', latency_ms: Date.now() - t0, message: 'Service check failed' }
  }
}

async function checkStripe(key: string | undefined): Promise<CheckResult> {
  if (!key) return { status: 'not_configured', latency_ms: 0 }
  const t0 = Date.now()
  try {
    const stripe = await (await import('@/lib/stripe')).getStripe()
    await stripe.customers.list({ limit: 1 })
    return { status: 'ok', latency_ms: Date.now() - t0 }
  } catch (e) {
    return { status: 'error', latency_ms: Date.now() - t0, message: 'Service check failed' }
  }
}

async function checkMercadoPago(token: string | undefined, testMode: boolean): Promise<CheckResult & { account?: { id: number; nickname: string; email: string; siteId: string; testMode: boolean } }> {
  if (!token) return { status: 'not_configured', latency_ms: 0 }
  const t0 = Date.now()
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return { status: 'error', latency_ms: Date.now() - t0, message: `MP API returned HTTP ${res.status}` }
    }
    const data = await res.json()
    return {
      status: 'ok',
      latency_ms: Date.now() - t0,
      message: 'configured',
      account: {
        id: data.id,
        nickname: data.nickname,
        email: data.email,
        siteId: data.site_id,
        // Test-mode access tokens start with TEST-, live ones with APP_USR-
        testMode: testMode || token.startsWith('TEST-'),
      },
    }
  } catch (e) {
    return { status: 'error', latency_ms: Date.now() - t0, message: 'Service check failed' }
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  let config: Record<string, string | undefined>
  try {
    config = await getIntegrationValues(['STRIPE_SECRET_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_TEST_MODE',
      'FACTURAPI_KEY', 'CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY',
      'CLOUDFLARE_R2_BUCKET', 'BREVO_API_KEY', 'RESEND_API_KEY'])
  } catch {
    return NextResponse.json({ status: 'error', message: 'Integration configuration unavailable' }, { status: 503 })
  }
  const [prisma, stripe, mercadoPago] = await Promise.all([
    checkPrisma(), checkStripe(config.STRIPE_SECRET_KEY), checkMercadoPago(config.MERCADOPAGO_ACCESS_TOKEN, config.MERCADOPAGO_TEST_MODE === 'true'),
  ])
  const configured = (present: unknown): CheckResult => ({ status: present ? 'ok' : 'not_configured', latency_ms: 0 })
  const facturapi = configured(config.FACTURAPI_KEY)
  const r2 = configured(config.CLOUDFLARE_R2_ACCOUNT_ID && config.CLOUDFLARE_R2_ACCESS_KEY && config.CLOUDFLARE_R2_SECRET_KEY && config.CLOUDFLARE_R2_BUCKET)
  const email = configured(config.BREVO_API_KEY || (config.RESEND_API_KEY && config.RESEND_API_KEY.length > 5))

  const checks = { prisma, stripe, mercadopago: mercadoPago, facturapi, r2, email }
  const values = Object.values(checks)
  const hasError = values.some((c) => c.status === 'error')
  const allConfigured = values.every((c) => c.status === 'ok')

  const status = hasError ? 'error' : allConfigured ? 'ok' : 'degraded'

  return NextResponse.json({
    status,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '?',
    environment: process.env.NODE_ENV || 'development',
    uptime_s: Math.floor(process.uptime()),
    latency_ms: Date.now() - startedAt,
    checks,
  })
}
