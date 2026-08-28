import { NextResponse } from 'next/server'
import { prisma } from '@cbc/db'
import { withDbRetry } from '@/lib/db'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ENV_GROUPS: Record<string, { label: string; vars: string[] }> = {
  database:    { label: 'PostgreSQL', vars: ['DATABASE_URL'] },
  auth:        { label: 'Auth', vars: ['NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'ADMIN_EMAIL'] },
  app:         { label: 'App', vars: ['NEXT_PUBLIC_APP_URL'] },
  stripe:      { label: 'Stripe', vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] },
  mercadopago: { label: 'Mercado Pago', vars: ['MERCADOPAGO_ACCESS_TOKEN'] },
  facturapi:   { label: 'Facturapi (CFDI)', vars: ['FACTURAPI_KEY', 'CBC_RFC', 'CBC_RAZON_SOCIAL', 'CBC_CODIGO_POSTAL_FISCAL'] },
  ai:          { label: 'AI (Claude / OpenAI)', vars: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'] },
  whatsapp:    { label: 'WhatsApp', vars: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'LORENA_PHONE'] },
  email:       { label: 'Email (Brevo o Resend)', vars: [] }, // special-cased in checkEnv
  r2:          { label: 'Cloudflare R2', vars: ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'CLOUDFLARE_R2_BUCKET'] },
  google:      { label: 'Google OAuth', vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
}

function checkEnv(groupId: string): { configured: boolean; missing: string[] } {
  // Email needs a sender address and EITHER provider key (Brevo preferred)
  if (groupId === 'email') {
    const hasFrom = Boolean(process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL)
    const hasProvider = Boolean(
      process.env.BREVO_API_KEY ||
      (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 5)
    )
    const missing: string[] = []
    if (!hasProvider) missing.push('BREVO_API_KEY (o RESEND_API_KEY)')
    if (!hasFrom) missing.push('EMAIL_FROM (o RESEND_FROM_EMAIL)')
    return { configured: hasProvider && hasFrom, missing }
  }
  const group = ENV_GROUPS[groupId]
  const missing = group.vars.filter(v => !process.env[v])
  return { configured: missing.length === 0, missing }
}

export async function GET() {
  const startedAt = Date.now()
  const checks: Record<string, unknown> = {}
  const errors: { service: string; message: string }[] = []

  // ── 1. Database ──────────────────────────────────────────────────────────
  // Retry so a Postgres cold start ("the database system is starting up")
  // doesn't flip health to degraded on the first probe after a wake/deploy.
  try {
    const dbStart = Date.now()
    await withDbRetry(() => prisma.$queryRaw`SELECT 1`, 2, 300)
    checks.database = { status: 'ok', latency_ms: Date.now() - dbStart }
  } catch (e) {
    checks.database = { status: 'error' }
    errors.push({ service: 'database', message: (e as Error).message })
  }

  // ── 2. Cloudflare R2 ────────────────────────────────────────────────────
  if (process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCESS_KEY) {
    try {
      const r2start = Date.now()
      const r2 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
        },
      })
      await r2.send(new ListBucketsCommand({}))
      checks.r2 = { status: 'ok', latency_ms: Date.now() - r2start }
    } catch (e) {
      checks.r2 = { status: 'error' }
      errors.push({ service: 'r2', message: (e as Error).message })
    }
  } else {
    checks.r2 = { status: 'not_configured' }
  }

  // ── 3. Environment variables ───────────────────────────────────────────
  const envStatus: Record<string, { configured: boolean; missing: string[] }> = {}
  for (const key of Object.keys(ENV_GROUPS)) {
    envStatus[key] = checkEnv(key)
  }
  checks.environment = envStatus

  // ── 5. System info ─────────────────────────────────────────────────────
  const totalLatency = Date.now() - startedAt
  const overallStatus = errors.length === 0 ? 'ok' : 'degraded'

  return NextResponse.json({
    status: overallStatus,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '?',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    latency_ms: totalLatency,
    checks,
    errors: errors.length > 0 ? errors : undefined,
  }, { status: overallStatus === 'ok' ? 200 : 503 })
}
