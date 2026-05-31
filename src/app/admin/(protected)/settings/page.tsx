import { db } from '@/lib/db'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const metadata = { title: 'Configuración' }

const API_KEY_SETTINGS = [
  { key: 'anthropic_api_key',          label: 'Anthropic API Key',          hint: 'Para Claude — generación de copy',       prefix: 'sk-ant-' },
  { key: 'openai_api_key',             label: 'OpenAI API Key',              hint: 'Para DALL-E 3 — generación de imágenes', prefix: 'sk-' },
  { key: 'meta_access_token',          label: 'Meta Access Token',           hint: 'Instagram + Facebook Graph API',         prefix: '' },
  { key: 'meta_instagram_account_id',  label: 'Instagram Account ID',        hint: 'ID numérico de la cuenta de negocios',   prefix: '' },
  { key: 'meta_facebook_page_id',      label: 'Facebook Page ID',            hint: 'ID numérico de la página',               prefix: '' },
  { key: 'linkedin_access_token',      label: 'LinkedIn Access Token',       hint: 'Token de la app de LinkedIn',            prefix: '' },
  { key: 'linkedin_person_urn',        label: 'LinkedIn Person URN',         hint: 'urn:li:person:...',                      prefix: 'urn:li:' },
  { key: 'stripe_secret_key',          label: 'Stripe Secret Key',           hint: 'Para pagos con tarjeta y OXXO',          prefix: 'sk_' },
  { key: 'stripe_webhook_secret',      label: 'Stripe Webhook Secret',       hint: 'Para verificar pagos',                   prefix: 'whsec_' },
  { key: 'facturapi_key',              label: 'Facturapi Key',               hint: 'Para generar CFDIs',                     prefix: 'sk_' },
  { key: 'resend_api_key',             label: 'Resend API Key',              hint: 'Para envíos de email',                   prefix: 're_' },
  { key: 'whatsapp_token',             label: 'WhatsApp Business Token',     hint: 'Meta Cloud API',                         prefix: '' },
  { key: 'whatsapp_phone_number_id',   label: 'WhatsApp Phone Number ID',    hint: 'ID del número de WhatsApp',              prefix: '' },
]

const BRAND_VOICE_KEY = 'brand_voice_prompt'

async function getSettings() {
  const rows = await db.setting.findMany({
    where: {
      key: {
        in: [...API_KEY_SETTINGS.map((s) => s.key), BRAND_VOICE_KEY, 'brand_voice_updated_at'],
      },
    },
  })
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export default async function SettingsPage() {
  const settings = await getSettings()

  const apiKeyValues = Object.fromEntries(
    API_KEY_SETTINGS.map((s) => [s.key, settings[s.key] || ''])
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          API keys, cuentas sociales y voz de marca.
          Los valores se guardan en la base de datos encriptados.
        </p>
      </div>

      <SettingsForm
        apiKeys={API_KEY_SETTINGS}
        apiKeyValues={apiKeyValues}
        brandVoice={settings[BRAND_VOICE_KEY] || ''}
        brandVoiceUpdatedAt={settings['brand_voice_updated_at'] || ''}
      />
    </div>
  )
}
