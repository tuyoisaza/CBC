import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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
    return { status: 'error', latency_ms: Date.now() - t0, message: (e as Error).message }
  }
}

async function checkStripe(): Promise<CheckResult> {
  if (!process.env.STRIPE_SECRET_KEY) return { status: 'not_configured', latency_ms: 0 }
  const t0 = Date.now()
  try {
    const stripe = (await import('@/lib/stripe')).stripe
    await stripe.customers.list({ limit: 1 })
    return { status: 'ok', latency_ms: Date.now() - t0 }
  } catch (e) {
    return { status: 'error', latency_ms: Date.now() - t0, message: (e as Error).message }
  }
}

function checkMercadoPago(): CheckResult {
  return process.env.MERCADOPAGO_ACCESS_TOKEN
    ? { status: 'ok', latency_ms: 0, message: 'configured' }
    : { status: 'not_configured', latency_ms: 0 }
}

function checkFacturapi(): CheckResult {
  return process.env.FACTURAPI_KEY
    ? { status: 'ok', latency_ms: 0, message: 'configured' }
    : { status: 'not_configured', latency_ms: 0 }
}

function checkR2(): CheckResult {
  return process.env.CLOUDFLARE_R2_ACCESS_KEY
    ? { status: 'ok', latency_ms: 0, message: 'configured' }
    : { status: 'not_configured', latency_ms: 0 }
}

function checkEmail(): CheckResult {
  if (process.env.BREVO_API_KEY) return { status: 'ok', latency_ms: 0, message: 'brevo configured' }
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 5) return { status: 'ok', latency_ms: 0, message: 'resend configured' }
  return { status: 'not_configured', latency_ms: 0 }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const [prisma, stripe] = await Promise.all([checkPrisma(), checkStripe()])
  const mercadoPago = checkMercadoPago()
  const facturapi = checkFacturapi()
  const r2 = checkR2()
  const email = checkEmail()

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
