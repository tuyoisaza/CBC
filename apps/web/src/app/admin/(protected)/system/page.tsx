import { getIntegrationValues } from '@/lib/integration-secrets'
import { INTEGRATION_KEYS } from '@/lib/integration-catalog'
import { Activity, Clock, Cpu, HardDrive, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperadminSession } from '@/lib/superadmin'

export const metadata = { title: 'Sistema' }
export const dynamic = 'force-dynamic'

const CONFIGURATION_ITEMS = [
  {
    key: 'DATABASE_URL', label: 'Base de datos',
    purpose: 'Conecta CBC con PostgreSQL para guardar productos, clientes, pedidos y configuración. Es necesaria para operar la plataforma.',
    source: 'La proporciona el servicio PostgreSQL de Railway (o tu proveedor de base de datos), en sus datos de conexión. El responsable técnico debe asignarla al servicio web como variable DATABASE_URL.',
  },
  {
    key: 'NEXTAUTH_SECRET', label: 'Seguridad de las sesiones',
    purpose: 'Protege las sesiones de acceso al administrador. Es necesaria para mantener seguro el inicio de sesión.',
    source: 'No se obtiene de un proveedor: el responsable técnico debe generar un secreto aleatorio seguro y guardarlo en las variables del servicio web en Railway. No reemplaces uno existente sólo por completar esta lista.',
  },
  {
    key: 'NEXTAUTH_URL', label: 'Dirección de inicio de sesión',
    purpose: 'Indica la URL pública de CBC para los retornos del inicio de sesión. Debe coincidir con el dominio desde el que se utiliza la aplicación.',
    source: 'Usa la dirección HTTPS pública del sitio, disponible en el dominio configurado en Railway. El responsable técnico debe guardarla como NEXTAUTH_URL en las variables del servicio web.',
  },
  {
    key: 'ADMIN_EMAIL', label: 'Correo de acceso con contraseña',
    purpose: 'Identifica la cuenta del acceso alternativo por correo y contraseña. Sólo se necesita si usas ese acceso; no configura los permisos de acceso con Google.',
    source: 'Es el correo elegido por el propietario para ese acceso. El responsable técnico lo guarda en Railway junto con ADMIN_PASSWORD_HASH, que contiene la contraseña cifrada mediante hash.',
  },
  {
    key: 'STRIPE_SECRET_KEY', label: 'Cobros con Stripe',
    purpose: 'Permite crear cobros con Stripe. Se necesita cuando utilizas Stripe como proveedor de pagos; por sí sola no completa la configuración de pagos y webhooks.',
    source: 'En el Dashboard de Stripe, abre API keys y obtén la clave secreta del entorno correspondiente. Guárdala en Configuración → Stripe y completa los demás campos del proveedor.',
    guide: 'https://docs.stripe.com/keys',
  },
  {
    key: 'MERCADOPAGO_ACCESS_TOKEN', label: 'Cobros con Mercado Pago',
    purpose: 'Autoriza a CBC a crear pagos en tu cuenta de Mercado Pago. Se necesita si cobras con este proveedor. La cuenta vinculada se consulta en Pagos.',
    source: 'En Mercado Pago Developers, abre Tus integraciones, selecciona la aplicación y sus Credenciales. Guarda el Access Token del entorno correspondiente en Configuración → Mercado Pago y completa la firma del webhook.',
    guide: 'https://www.mercadopago.com.mx/developers/es/docs/your-integrations/credentials',
  },
  {
    key: 'FACTURAPI_KEY', label: 'Facturación electrónica',
    purpose: 'Permite emitir facturas electrónicas mediante Facturapi. Se necesita si vas a facturar desde CBC; la organización emisora también debe estar habilitada en Facturapi.',
    source: 'En Facturapi, selecciona tu organización y abre Integración → API Keys. Obtén su llave secreta del entorno correspondiente y guárdala en Configuración → Facturapi.',
    guide: 'https://help.facturapi.io/es/articles/9231013-obtener-live-secret-key-para-conectar-facturapi-a-otro-sistema',
  },
  {
    key: 'WHATSAPP_TOKEN', label: 'Notificaciones por WhatsApp',
    purpose: 'Autoriza el envío de mensajes mediante WhatsApp Business. Se necesita si utilizas estas notificaciones; también requiere el número y los demás datos de Meta.',
    source: 'Se obtiene en Meta para la aplicación y cuenta de WhatsApp Business del negocio. Pide al administrador de Meta un token con acceso al número y guárdalo en Configuración → WhatsApp junto con los demás campos.',
  },
  {
    key: 'RESEND_API_KEY', label: 'Correo con Resend',
    purpose: 'Permite enviar correos transaccionales con Resend. Es la alternativa cuando Brevo no está configurado; no necesitas ambos proveedores para enviar correo.',
    source: 'En Resend, abre API Keys y crea una clave con permiso de envío. Guárdala en Configuración → Resend y configura un remitente autorizado con el dominio verificado.',
    guide: 'https://resend.com/docs/dashboard/api-keys/introduction',
  },
  {
    key: 'BREVO_API_KEY', label: 'Correo con Brevo',
    purpose: 'Permite enviar correos de cotizaciones, pagos y otras notificaciones. CBC usa Brevo de forma preferente cuando esta clave está presente; si utilizas Resend, no es obligatorio configurar Brevo.',
    source: 'Obtén una API key desde tu cuenta de Brevo y guárdala en Configuración → Brevo. Completa también el remitente y verifica que esté autorizado en Brevo.',
    guide: 'https://developers.brevo.com/docs/getting-started',
  },
  {
    key: 'CLOUDFLARE_R2_ACCESS_KEY', label: 'Archivos e imágenes',
    purpose: 'Identifica el acceso al almacenamiento R2 para subir archivos e imágenes del catálogo. Se necesita para las cargas a R2, junto con la clave secreta, cuenta y bucket.',
    source: 'En Cloudflare R2, crea un token API con permisos para el bucket y copia el Access Key ID. Guárdalo en Configuración → Almacenamiento R2 junto con el Secret Access Key y los demás datos.',
    guide: 'https://developers.cloudflare.com/r2/api/tokens/',
  },
  {
    key: 'SENTRY_DSN', label: 'Registro de errores',
    purpose: 'Es la dirección del proyecto de Sentry para recibir errores técnicos. Es opcional: guardar este dato no activa por sí solo el monitoreo; el responsable técnico debe completar la integración de Sentry.',
    source: 'El administrador del proyecto de Sentry obtiene el DSN en la configuración del proyecto, en Client Keys (DSN). El responsable técnico lo guarda en las variables del servicio web en Railway.',
  },
]

export default async function SystemPage() {
  const isSuperadmin = await isSuperadminSession(await getServerSession(authOptions))
  const config = await getIntegrationValues(INTEGRATION_KEYS)
  const uptime = process.uptime()
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const mem = process.memoryUsage()

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Información del sistema y estado de servicios.
        </p>
      </div>

      {isSuperadmin && <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-semibold text-foreground">Claves API y secretos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Selecciona un proveedor en Configuración para guardar o reemplazar sus credenciales.</p>
        <Link href="/admin/configuration" className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Configurar claves y secretos
        </Link>
      </div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-muted-foreground">Versión</span>
          </div>
          <p className="text-lg font-bold text-foreground font-mono">
            {process.env.NEXT_PUBLIC_APP_VERSION || '?'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Uptime</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {hours}h {minutes}m
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground">Entorno</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {process.env.NODE_ENV || 'development'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-muted-foreground">Memoria</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {Math.round(mem.heapUsed / 1024 / 1024)}MB
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Estado de configuración</h2>
          <p className="mt-2 text-sm text-muted-foreground">Configurado significa que hay un valor guardado, no que la conexión o la credencial se hayan validado. Sin configurar indica que falta ese valor; algunas integraciones sólo se necesitan si utilizas su función.</p>
          <p className="mt-2 text-sm text-muted-foreground">Las credenciales de proveedores se guardan en Configuración por un superadministrador. Las variables del servidor las administra el responsable técnico en Railway. Aquí nunca se muestran los valores secretos.</p>
        </div>
        <div className="divide-y divide-border">
          {CONFIGURATION_ITEMS.map(({ key, label, purpose, source, guide }) => {
            const value = INTEGRATION_KEYS.includes(key) ? config[key] : process.env[key]
            const configured = Boolean(value?.trim())
            return (
              <div key={key} className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-xs ${configured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {configured ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <XCircle aria-hidden="true" className="h-3.5 w-3.5" />}
                    {configured ? 'Configurado' : 'Sin configurar'}
                  </span>
                </div>
                <p className="break-all font-mono text-xs text-muted-foreground">{key}</p>
                <p className="text-sm text-muted-foreground">{purpose}</p>
                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Dónde obtenerlo y guardarlo: </span>{source}</p>
                {guide && <a href={guide} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-primary underline underline-offset-4">Guía oficial: {label} (abre otra pestaña)</a>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Servidor</h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Hora del servidor: </span>
            <span className="text-foreground font-mono">{new Date().toISOString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Node.js: </span>
            <span className="text-foreground font-mono">{process.version}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Plataforma: </span>
            <span className="text-foreground font-mono">{process.platform} {process.arch}</span>
          </div>
          <div>
            <span className="text-muted-foreground">PID: </span>
            <span className="text-foreground font-mono">{process.pid}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
