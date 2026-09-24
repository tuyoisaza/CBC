'use client'

import { useCallback, useEffect, useState } from 'react'

type ConfigurationField = {
  key: string
  label: string
  kind: 'secret' | 'text' | 'boolean'
  help: string
  placeholder?: string
  configured: boolean
  source: 'database' | 'environment' | 'disabled' | 'missing'
  updatedAt: string | null
  value?: string
}
type Provider = { id: string; label: string; description: string; fields: ConfigurationField[] }
type Configuration = { encryptionReady: boolean; providers: Provider[] }
type Changes = { values: Record<string, string>; disable?: string[] }

const SOURCE_LABELS = {
  database: 'Guardado en CBC', environment: 'Desde el servidor', disabled: 'Desactivado', missing: 'Sin configurar',
}
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50'
const buttonClass = 'rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50'

export function ProviderConfiguration() {
  const [configuration, setConfiguration] = useState<Configuration | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/configuration', { cache: 'no-store' })
    if (!response.ok) throw new Error('configuration-unavailable')
    const data: Configuration = await response.json()
    // Secret values are never part of the UI model, even if a server response
    // accidentally includes one. Existing credentials cannot be revealed.
    const safe = { ...data, providers: data.providers.map(provider => ({
      ...provider, fields: provider.fields.map(field => field.kind === 'secret' ? { ...field, value: undefined } : field),
    })) }
    setConfiguration(safe)
    setSelectedId(current => safe.providers.some(provider => provider.id === current) ? current : safe.providers[0]?.id || '')
  }, [])

  useEffect(() => {
    let mounted = true
    load().catch(() => { if (mounted) setError('No se pudo cargar la configuración. Vuelve a intentar.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [load])

  if (loading) return <p role="status" className="text-sm text-muted-foreground">Cargando configuración…</p>
  if (!configuration) return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">{error}</p>
      <button type="button" className={buttonClass} onClick={async () => {
        setLoading(true)
        try { await load(); setError('') } catch { setError('No se pudo cargar la configuración. Vuelve a intentar.') }
        finally { setLoading(false) }
      }}>Reintentar</button>
    </div>
  )

  const selected = configuration.providers.find(provider => provider.id === selectedId)
  return (
    <div className="space-y-6">
      {!configuration.encryptionReady && <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        Falta configurar el cifrado del servidor. Por ahora sólo puedes consultar el estado de las integraciones.
      </p>}
      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Proveedores de integración" className="grid gap-2 self-start sm:grid-cols-2 xl:grid-cols-1">
          {configuration.providers.map(provider => (
            <button key={provider.id} type="button" aria-pressed={selectedId === provider.id}
              onClick={() => setSelectedId(provider.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${selectedId === provider.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'}`}>
              <span className="block text-sm font-semibold text-foreground">{provider.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {provider.fields.filter(field => field.configured).length} de {provider.fields.length} campos configurados
              </span>
            </button>
          ))}
        </nav>
        {selected && <ProviderForm key={selected.id} provider={selected} encryptionReady={configuration.encryptionReady} reload={load} />}
      </div>
    </div>
  )
}

function ProviderForm({ provider, encryptionReady, reload }: { provider: Provider; encryptionReady: boolean; reload: () => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [confirmDisable, setConfirmDisable] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const hasChanges = Object.values(values).some(value => value.trim() !== '')

  async function mutate(changes: Changes | 'import') {
    if (busy || !encryptionReady) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(changes === 'import' ? '/api/admin/configuration/import' : `/api/admin/configuration/${encodeURIComponent(provider.id)}`, {
        method: changes === 'import' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes === 'import' ? { provider: provider.id } : changes),
      })
      if (!response.ok) throw new Error('save-failed')
      // Clear write-only input immediately after success, before refreshing.
      setValues({})
      setConfirmDisable(null)
      setMessage(changes === 'import' ? 'Configuración importada desde el servidor.' : 'Configuración guardada.')
      try { await reload() } catch { setError('Se guardaron los cambios, pero no se pudo actualizar el estado. Recarga la página.') }
    } catch {
      // Do not render provider/API response bodies: they can contain credentials.
      setError('No se pudo guardar la configuración. Vuelve a intentar.')
    } finally { setBusy(false) }
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby={`provider-${provider.id}`}>
      <h2 id={`provider-${provider.id}`} className="text-lg font-semibold text-foreground">{provider.label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>
      <p className="mt-3 text-sm text-muted-foreground">Las claves guardadas no se muestran. Escribe una nueva para reemplazarla; deja el campo vacío para conservarla.</p>
      <form className="mt-6 space-y-6" autoComplete="off" onSubmit={event => {
        event.preventDefault()
        const changed = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== ''))
        if (Object.keys(changed).length) void mutate({ values: changed })
      }}>
        <fieldset disabled={busy || !encryptionReady} className="space-y-6">
          {provider.fields.map(field => {
            const id = `integration-${provider.id}-${field.key}`
            return <div key={field.key} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={id} className="text-sm font-medium text-foreground">{field.label}</label>
                <span className={`rounded-full px-2 py-0.5 text-xs ${field.configured ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {SOURCE_LABELS[field.source]}
                </span>
              </div>
              {field.kind === 'boolean' ? (
                <select id={id} value={values[field.key] ?? ''} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))}
                  aria-describedby={`${id}-help`} className={inputClass}>
                  <option value="">{field.value === 'true' ? 'Actual: Sí (sin cambios)' : field.value === 'false' ? 'Actual: No (sin cambios)' : 'Sin cambios'}</option>
                  <option value="true">Sí</option><option value="false">No</option>
                </select>
              ) : (
                <input id={id} name={field.key} type={field.kind === 'secret' ? 'password' : 'text'}
                  value={values[field.key] ?? (field.kind === 'secret' ? '' : field.value || '')}
                  onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.kind === 'secret' && field.configured ? 'Nueva clave (opcional)' : field.placeholder}
                  autoComplete={field.kind === 'secret' ? 'new-password' : 'off'} spellCheck={false} autoCapitalize="none"
                  aria-describedby={`${id}-help`} className={inputClass} />
              )}
              <p id={`${id}-help`} className="text-xs text-muted-foreground">{field.help}</p>
              {field.updatedAt && <p className="text-xs text-muted-foreground">Actualizado: {new Date(field.updatedAt).toLocaleString('es-MX')}</p>}
              {field.configured && (confirmDisable === field.key ? (
                <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
                  <p className="text-sm">¿Desactivar {field.label}? Dejará de usarse, aunque exista un valor en el servidor.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void mutate({ values: {}, disable: [field.key] })} className={`${buttonClass} text-destructive`}>Confirmar desactivación</button>
                    <button type="button" onClick={() => setConfirmDisable(null)} className={buttonClass}>Cancelar</button>
                  </div>
                </div>
              ) : <button type="button" onClick={() => setConfirmDisable(field.key)} className="text-xs text-destructive hover:underline">Desactivar {field.label}</button>)}
            </div>
          })}
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p>}
        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          <button type="submit" disabled={busy || !encryptionReady || !hasChanges} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {provider.fields.some(field => field.source === 'environment') && <button type="button" disabled={busy || !encryptionReady}
            onClick={() => void mutate('import')} className={buttonClass}>Importar desde servidor</button>}
        </div>
      </form>
    </section>
  )
}
