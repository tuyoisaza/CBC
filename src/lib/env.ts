import { z } from 'zod'

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ADMIN_URL: z.string().url(),
  CBC_ENGINE_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD_HASH: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // SAT / Facturapi
  FACTURAPI_KEY: z.string().min(1),
  CBC_RFC: z.string().min(12).max(13),
  CBC_RAZON_SOCIAL: z.string().min(1),
  CBC_REGIMEN_FISCAL: z.string().default('601'),
  CBC_CODIGO_POSTAL_FISCAL: z.string().length(5),
  CBC_CSD_CERT_BASE64: z.string().min(1),
  CBC_CSD_KEY_BASE64: z.string().min(1),
  CBC_CSD_PASSWORD: z.string().min(1),

  // AI
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  OPENAI_API_KEY: z.string().startsWith('sk-'),

  // Meta
  META_ACCESS_TOKEN: z.string().min(1),
  META_INSTAGRAM_ACCOUNT_ID: z.string().min(1),
  META_FACEBOOK_PAGE_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),

  // LinkedIn
  LINKEDIN_ACCESS_TOKEN: z.string().min(1),
  LINKEDIN_PERSON_URN: z.string().startsWith('urn:li:'),

  // WhatsApp
  WHATSAPP_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(16),
  LORENA_PHONE: z.string().min(10),

  // Email
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().email(),

  // Cloudflare R2
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_R2_SECRET_KEY: z.string().min(1),
  CLOUDFLARE_R2_BUCKET: z.string().min(1),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
})

// In development, allow missing optional API keys
const devSchema = envSchema.partial({
  STRIPE_SECRET_KEY: true,
  STRIPE_WEBHOOK_SECRET: true,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: true,
  FACTURAPI_KEY: true,
  CBC_RFC: true,
  CBC_RAZON_SOCIAL: true,
  CBC_CODIGO_POSTAL_FISCAL: true,
  CBC_CSD_CERT_BASE64: true,
  CBC_CSD_KEY_BASE64: true,
  CBC_CSD_PASSWORD: true,
  ANTHROPIC_API_KEY: true,
  OPENAI_API_KEY: true,
  META_ACCESS_TOKEN: true,
  META_INSTAGRAM_ACCOUNT_ID: true,
  META_FACEBOOK_PAGE_ID: true,
  META_APP_SECRET: true,
  LINKEDIN_ACCESS_TOKEN: true,
  LINKEDIN_PERSON_URN: true,
  WHATSAPP_TOKEN: true,
  WHATSAPP_PHONE_NUMBER_ID: true,
  WHATSAPP_VERIFY_TOKEN: true,
  LORENA_PHONE: true,
  CLOUDFLARE_R2_ACCOUNT_ID: true,
  CLOUDFLARE_R2_ACCESS_KEY: true,
  CLOUDFLARE_R2_SECRET_KEY: true,
  CLOUDFLARE_R2_BUCKET: true,
  NEXT_PUBLIC_R2_PUBLIC_URL: true,
})

const schema = process.env.NODE_ENV === 'production' ? envSchema : devSchema

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
}

export const env = parsed.data as z.infer<typeof envSchema>
