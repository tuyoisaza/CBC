'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Instagram, Facebook, Linkedin, CheckCircle2, AlertTriangle, Unplug } from 'lucide-react'

interface Status {
  meta:
    | { connected: true; pageName: string; igUsername: string | null; connectedAt: string }
    | { connected: false }
  linkedin:
    | { connected: true; name: string | null; connectedAt: string; expiresAt: string | null }
    | { connected: false }
  appsConfigured: { meta: boolean; linkedin: boolean }
}

const ERROR_MESSAGES: Record<string, string> = {
  meta_app_not_configured:
    'Faltan META_APP_ID y META_APP_SECRET en las variables del servicio web.',
  linkedin_app_not_configured:
    'Faltan LINKEDIN_CLIENT_ID y LINKEDIN_CLIENT_SECRET en las variables del servicio web.',
  meta_denied: 'Autorización cancelada en Facebook.',
  linkedin_denied: 'Autorización cancelada en LinkedIn.',
  state_mismatch: 'La sesión de autorización expiró. Intenta de nuevo.',
  meta_oauth_failed: 'Falló la conexión con Meta. Revisa los permisos de la app e intenta de nuevo.',
  linkedin_oauth_failed: 'Falló la conexión con LinkedIn. Intenta de nuevo.',
  no_pages: 'Tu cuenta de Facebook no administra ninguna página. Necesitas ser admin de la página de CBC.',
}

export function SocialConnections({ status }: { status: Status }) {
  const router = useRouter()
  const params = useSearchParams()
  const [busy, setBusy] = useState<string | null>(null)

  const error = params.get('error')
  const connected = params.get('connected')

  async function handleDisconnect(network: 'meta' | 'linkedin') {
    if (!confirm('¿Desconectar esta cuenta? El motor dejará de publicar ahí hasta reconectar.')) return
    setBusy(network)
    await fetch('/api/admin/social', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ network }),
    })
    setBusy(null)
    router.refresh()
  }

  const linkedinExpiring =
    status.linkedin.connected &&
    status.linkedin.expiresAt &&
    new Date(status.linkedin.expiresAt).getTime() - Date.now() < 14 * 24 * 3600 * 1000

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ERROR_MESSAGES[error] || `Error: ${error}`}
        </div>
      )}
      {connected && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          ✓ Cuenta conectada. El motor ya puede publicar ahí.
        </div>
      )}

      {/* ─── Meta: Instagram + Facebook ─── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Instagram className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                Instagram + Facebook
                {status.meta.connected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </p>
              {status.meta.connected ? (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Página: <strong>{status.meta.pageName}</strong>
                  {status.meta.igUsername && (
                    <> · IG: <strong>@{status.meta.igUsername}</strong></>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">
                  No conectado. El motor no puede publicar en Instagram ni Facebook.
                </p>
              )}
              {status.meta.connected && !status.meta.igUsername && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> La página no tiene cuenta de Instagram Business vinculada.
                </p>
              )}
            </div>
          </div>

          {status.meta.connected ? (
            <button
              onClick={() => handleDisconnect('meta')}
              disabled={busy === 'meta'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <Unplug className="h-3.5 w-3.5" /> Desconectar
            </button>
          ) : status.appsConfigured.meta ? (
            <a
              href="/api/auth/social/meta"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Conectar
            </a>
          ) : (
            <span className="text-xs text-muted-foreground text-right max-w-[180px]">
              Configura META_APP_ID y META_APP_SECRET primero
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-1 text-muted-foreground">
          <Facebook className="h-4 w-4" />
          <Instagram className="h-4 w-4" />
        </div>
      </div>

      {/* ─── LinkedIn ─── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Linkedin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                LinkedIn
                {status.linkedin.connected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </p>
              {status.linkedin.connected ? (
                <>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {status.linkedin.name ? <>Perfil: <strong>{status.linkedin.name}</strong></> : 'Conectado'}
                  </p>
                  {status.linkedin.expiresAt && (
                    <p className={`text-xs mt-1 ${linkedinExpiring ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                      {linkedinExpiring && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                      Token válido hasta{' '}
                      {new Date(status.linkedin.expiresAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {linkedinExpiring && ' — reconecta pronto'}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-0.5">
                  No conectado. El motor no puede publicar en LinkedIn.
                </p>
              )}
            </div>
          </div>

          {status.linkedin.connected ? (
            <div className="flex flex-col gap-2 items-end">
              <a
                href="/api/auth/social/linkedin"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Reconectar
              </a>
              <button
                onClick={() => handleDisconnect('linkedin')}
                disabled={busy === 'linkedin'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                <Unplug className="h-3.5 w-3.5" /> Desconectar
              </button>
            </div>
          ) : status.appsConfigured.linkedin ? (
            <a
              href="/api/auth/social/linkedin"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Conectar
            </a>
          ) : (
            <span className="text-xs text-muted-foreground text-right max-w-[180px]">
              Configura LINKEDIN_CLIENT_ID y LINKEDIN_CLIENT_SECRET primero
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        💡 Los tokens se guardan en la base de datos y el motor los toma automáticamente.
        LinkedIn expira cada ~60 días — la tarjeta avisa cuando toque reconectar.
      </p>
    </div>
  )
}
