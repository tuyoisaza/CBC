import { z } from 'zod'

const envSchema = z.object({
  // ─── App ─────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().optional(),
  CBC_ENGINE_URL: z.string().url().optional(),

  // ─── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1),

  // ─── Auth ─────────────────────────────────────────────────────────────────
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_HASH: z.string().min(1),

  // ─── Stripe ───────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),

  // ─── SAT / Facturapi ──────────────────────────────────────────────────────
  FACTURAPI_KEY: z.string().min(1).optional(),
  CBC_RFC: z.string().min(12).max(13).optional(),
  CBC_RAZON_SOCIAL: z.string().min(1).optional(),
  CBC_REGIMEN_FISCAL: z.string().default('601'),
  CBC_CODIGO_POSTAL_FISCAL: z.string().length(5).optional(),
  CBC_CSD_CERT_BASE64: z.string().min(1).optional(),
  CBC_CSD_KEY_BASE64: z.string().min(1).optional(),
  CBC_CSD_PASSWORD: z.string().min(1).optional(),

  // ─── AI ───────────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),

  // ─── Meta (Instagram / Facebook) ──────────────────────────────────────────
  META_ACCESS_TOKEN: z.string().min(1).optional(),
  META_INSTAGRAM_ACCOUNT_ID: z.string().min(1).optional(),
  META_FACEBOOK_PAGE_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),

  // ─── LinkedIn ─────────────────────────────────────────────────────────────
  LINKEDIN_ACCESS_TOKEN: z.string().min(1).optional(),
  LINKEDIN_PERSON_URN: z.string().startsWith('urn:li:').optional(),

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  WHATSAPP_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().min(16).optional(),
  LORENA_PHONE: z.string().min(10).optional(),

  // ─── Email (Resend) ───────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // ─── Cloudflare R2 ────────────────────────────────────────────────────────
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().min(1).optional(),
  CLOUDFLARE_R2_SECRET_KEY: z.string().min(1).optional(),
  CLOUDFLARE_R2_BUCKET: z.string().min(1).optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),

  // ─── Monitoring ───────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  // Skip validation during Next.js build phase
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    process.exit(1)
  }
}

export const env = (parsed.data ?? {}) as z.infer<typeof envSchema>
