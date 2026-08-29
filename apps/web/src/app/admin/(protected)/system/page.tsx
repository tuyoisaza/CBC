import { Activity, Clock, Cpu, HardDrive, CheckCircle2, XCircle, Wallet } from 'lucide-react'

export const metadata = { title: 'Sistema' }
export const dynamic = 'force-dynamic'

const CRITICAL_ENV_VARS = [
  'DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'ADMIN_EMAIL',
  'STRIPE_SECRET_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'FACTURAPI_KEY',
  'WHATSAPP_TOKEN', 'RESEND_API_KEY', 'BREVO_API_KEY',
  'CLOUDFLARE_R2_ACCESS_KEY', 'SENTRY_DSN',
]

function getEnvStatus(key: string): { configured: boolean; value: string } {
  const val = process.env[key]
  if (!val) return { configured: false, value: '—' }
  return { configured: true, value: `${val.slice(0, 4)}${'*'.repeat(Math.min(val.length - 4, 8))}` }
}

type MpAccount = { ok: true; nickname: string; email: string; siteId: string; testMode: boolean } | { ok: false; error: string } | null

async function getMercadoPagoAccount(): Promise<MpAccount> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) return null
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, error: `Mercado Pago devolvió HTTP ${res.status}` }
    const data = await res.json()
    return {
      ok: true,
      nickname: data.nickname,
      email: data.email,
      siteId: data.site_id,
      testMode: token.startsWith('TEST-'),
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export default async function SystemPage() {
  const mpAccount = await getMercadoPagoAccount()
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
          <h2 className="text-sm font-semibold text-foreground">Variables de entorno</h2>
        </div>
        <div className="divide-y divide-border">
          {CRITICAL_ENV_VARS.map((key) => {
            const { configured, value } = getEnvStatus(key)
            return (
              <div key={key} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {configured ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500/60" />
                  )}
                  <span className="text-xs font-mono text-foreground">{key}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{value}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-cbc-yellow" />
          <h2 className="text-sm font-semibold text-foreground">Cuenta de Mercado Pago vinculada</h2>
        </div>
        {mpAccount === null && (
          <p className="text-xs text-muted-foreground">MERCADOPAGO_ACCESS_TOKEN no está configurado.</p>
        )}
        {mpAccount && !mpAccount.ok && (
          <p className="text-xs text-red-500">Error al consultar la cuenta: {mpAccount.error}</p>
        )}
        {mpAccount && mpAccount.ok && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Nickname: </span>
              <span className="text-foreground font-mono">{mpAccount.nickname}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span className="text-foreground font-mono">{mpAccount.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sitio: </span>
              <span className="text-foreground font-mono">{mpAccount.siteId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modo: </span>
              <span className={`font-mono font-semibold ${mpAccount.testMode ? 'text-amber-500' : 'text-green-500'}`}>
                {mpAccount.testMode ? 'PRUEBA (sandbox)' : 'PRODUCCIÓN'}
              </span>
            </div>
          </div>
        )}
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
