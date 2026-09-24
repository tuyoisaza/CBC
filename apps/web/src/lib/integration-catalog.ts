// Client-safe descriptions only. Credentials belong exclusively in integration-secrets.
export type IntegrationField = { key: string; label: string; kind: 'secret' | 'text' | 'boolean'; help: string; placeholder?: string }
export type IntegrationProvider = { id: string; label: string; description: string; fields: IntegrationField[] }
const secret = (key: string, label: string, help = 'Sólo escritura. Una nueva clave reemplaza la anterior.'): IntegrationField => ({ key, label, kind: 'secret', help })
const text = (key: string, label: string, help = 'Dato de configuración del proveedor; no es una clave secreta.'): IntegrationField => ({ key, label, kind: 'text', help })
export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  { id: 'mercadopago', label: 'Mercado Pago', description: 'Cobros y confirmación de pagos mediante Webhooks.', fields: [
    secret('MERCADOPAGO_ACCESS_TOKEN', 'Access token'), secret('MERCADOPAGO_WEBHOOK_SECRET', 'Firma secreta del webhook'),
    { key: 'MERCADOPAGO_TEST_MODE', label: 'Modo de prueba', kind: 'boolean', help: 'Actívalo sólo con cuentas de prueba. Los pagos de otro modo se rechazan.' },
  ] },
  { id: 'stripe', label: 'Stripe', description: 'Cobros con tarjeta y notificaciones de pago.', fields: [secret('STRIPE_SECRET_KEY', 'Clave secreta'), secret('STRIPE_WEBHOOK_SECRET', 'Firma secreta del webhook'), text('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Clave pública')] },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Mensajes y validación de notificaciones de Meta.', fields: [secret('WHATSAPP_TOKEN', 'Token de acceso'), text('WHATSAPP_PHONE_NUMBER_ID', 'ID del número de teléfono'), secret('WHATSAPP_VERIFY_TOKEN', 'Token de verificación'), secret('META_APP_SECRET', 'Clave secreta de Meta'), text('LORENA_PHONE', 'Teléfono de notificaciones internas')] },
  { id: 'brevo', label: 'Brevo', description: 'Correo transaccional principal.', fields: [secret('BREVO_API_KEY', 'API key'), text('EMAIL_FROM', 'Remitente')] },
  { id: 'resend', label: 'Resend', description: 'Proveedor alternativo de correo transaccional.', fields: [secret('RESEND_API_KEY', 'API key'), text('RESEND_FROM_EMAIL', 'Remitente')] },
  { id: 'anthropic', label: 'Anthropic', description: 'Modelos de IA de Claude.', fields: [secret('ANTHROPIC_API_KEY', 'API key')] },
  { id: 'openai', label: 'OpenAI', description: 'Modelos de IA de OpenAI.', fields: [secret('OPENAI_API_KEY', 'API key')] },
  { id: 'facturapi', label: 'Facturapi', description: 'Emisión de facturas electrónicas.', fields: [secret('FACTURAPI_KEY', 'API key')] },
  { id: 'r2', label: 'Almacenamiento R2', description: 'Archivos e imágenes del catálogo.', fields: [text('CLOUDFLARE_R2_ACCOUNT_ID', 'ID de cuenta'), secret('CLOUDFLARE_R2_ACCESS_KEY', 'Access key'), secret('CLOUDFLARE_R2_SECRET_KEY', 'Secret key'), text('CLOUDFLARE_R2_BUCKET', 'Bucket'), text('NEXT_PUBLIC_R2_PUBLIC_URL', 'URL pública de archivos', 'Dirección HTTPS pública del bucket.')] },
]

export const INTEGRATION_KEYS = INTEGRATION_PROVIDERS.flatMap(provider => provider.fields.map(field => field.key))
export function findIntegrationField(key: string) {
  for (const provider of INTEGRATION_PROVIDERS) {
    const field = provider.fields.find(item => item.key === key)
    if (field) return { provider, field }
  }
  return undefined
}
