import { db } from '@/lib/db'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const metadata = { title: 'Configuración' }

const API_KEY_SETTINGS = [
  { key: 'stripe_secret_key',          label: 'Stripe Secret Key',           hint: 'Para pagos con tarjeta y OXXO',          prefix: 'sk_' },
  { key: 'stripe_webhook_secret',      label: 'Stripe Webhook Secret',       hint: 'Para verificar pagos',                   prefix: 'whsec_' },
  { key: 'facturapi_key',              label: 'Facturapi Key',               hint: 'Para generar CFDIs',                     prefix: 'sk_' },
  { key: 'resend_api_key',             label: 'Resend API Key',              hint: 'Para envíos de email',                   prefix: 're_' },
  { key: 'whatsapp_token',             label: 'WhatsApp Business Token',     hint: 'Meta Cloud API',                         prefix: '' },
  { key: 'whatsapp_phone_number_id',   label: 'WhatsApp Phone Number ID',    hint: 'ID del número de WhatsApp',              prefix: '' },
]

const SETTINGS_KEYS = ['site_logo_url', 'logo_size', 'logo_alignment', 'logo_link', 'single_purchase_markup']

async function getSettings() {
  const rows = await db.setting.findMany({
    where: {
      key: {
        in: [...API_KEY_SETTINGS.map((s) => s.key), ...SETTINGS_KEYS],
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
          API keys y configuración del sitio.
          Los valores se guardan en la base de datos encriptados.
        </p>
      </div>

      <SettingsForm
        apiKeys={API_KEY_SETTINGS}
        apiKeyValues={apiKeyValues}
        logoUrl={settings['site_logo_url'] || ''}
        logoSize={settings['logo_size'] || 'medium'}
        logoAlignment={settings['logo_alignment'] || 'left'}
        logoLink={settings['logo_link'] || ''}
        singlePurchaseMarkup={settings['single_purchase_markup'] || '20'}
      />
    </div>
  )
}
