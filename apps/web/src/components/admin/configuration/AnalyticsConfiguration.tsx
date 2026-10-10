'use client'

import { useCallback, useEffect, useState } from 'react'
import { t } from '@/lib/i18n'

type Values = { googleMeasurementId: string; clarityProjectId: string }
const EMPTY_VALUES: Values = { googleMeasurementId: '', clarityProjectId: '' }
const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50'
const buttonClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50'
const configuredCount = (values: Values) => Object.values(values).filter(value => value.trim() !== '').length
const translate = (key: string) => t('es', `admin.analyticsSettings.${key}`)

export function AnalyticsConfiguration({ onConfiguredCountChange }: { onConfiguredCountChange?: (count: number) => void }) {
  const [saved, setSaved] = useState<Values | null>(null)
  const [values, setValues] = useState<Values>(EMPTY_VALUES)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/configuration/analytics', { cache: 'no-store' })
    if (!response.ok) throw new Error('analytics-settings-unavailable')
    const data: Values = await response.json()
    const safe = {
      googleMeasurementId: typeof data.googleMeasurementId === 'string' ? data.googleMeasurementId : '',
      clarityProjectId: typeof data.clarityProjectId === 'string' ? data.clarityProjectId : '',
    }
    setSaved(safe)
    setValues(safe)
    onConfiguredCountChange?.(configuredCount(safe))
  }, [onConfiguredCountChange])

  useEffect(() => {
    let active = true
    load().catch(() => { if (active) setError(translate('loadError')) })
    return () => { active = false }
  }, [load])

  const hasChanges = saved !== null && (saved.googleMeasurementId !== values.googleMeasurementId || saved.clarityProjectId !== values.clarityProjectId)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !hasChanges) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/configuration/analytics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('save-failed')
      setSaved(values)
      onConfiguredCountChange?.(configuredCount(values))
      setMessage(translate('saved'))
    } catch {
      setError(translate('saveError'))
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby="analytics-settings-title">
      <div>
        <h2 id="analytics-settings-title" className="text-lg font-semibold text-foreground">{translate('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{translate('description')}</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-foreground">
        <h3 className="font-semibold">{translate('howTo')}</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>{translate('googleSteps')}</li>
          <li>{translate('claritySteps')}</li>
        </ol>
        <p className="mt-3 text-muted-foreground">{translate('providerSetup')}</p>
      </div>

      {saved === null ? (
        <div className="space-y-3">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button type="button" className={buttonClass} disabled={busy} onClick={async () => {
            setBusy(true)
            setError('')
            try { await load() } catch { setError(translate('loadError')) }
            finally { setBusy(false) }
          }}>{busy ? translate('loading') : translate('retry')}</button>
        </div>
      ) : (
        <form className="space-y-5" autoComplete="off" onSubmit={save}>
          <fieldset disabled={busy} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="ga-measurement-id" className="text-sm font-medium text-foreground">{translate('googleLabel')}</label>
              <input id="ga-measurement-id" name="googleMeasurementId" type="text" inputMode="text" autoCapitalize="none" spellCheck={false}
                maxLength={32} pattern="G-[A-Z0-9]+" placeholder="G-XXXXXXXXXX" value={values.googleMeasurementId}
                onChange={event => setValues(current => ({ ...current, googleMeasurementId: event.target.value.trim() }))}
                aria-describedby="ga-measurement-help" className={inputClass} />
              <p id="ga-measurement-help" className="text-xs text-muted-foreground">{translate('googleHelp')}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="clarity-project-id" className="text-sm font-medium text-foreground">{translate('clarityLabel')}</label>
              <input id="clarity-project-id" name="clarityProjectId" type="text" inputMode="text" autoCapitalize="none" spellCheck={false}
                maxLength={64} pattern="[A-Za-z0-9]+" placeholder="XXXXXXXXXX" value={values.clarityProjectId}
                onChange={event => setValues(current => ({ ...current, clarityProjectId: event.target.value.trim() }))}
                aria-describedby="clarity-project-help" className={inputClass} />
              <p id="clarity-project-help" className="text-xs text-muted-foreground">{translate('clarityHelp')}</p>
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p>}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button type="submit" disabled={busy || !hasChanges} className={buttonClass}>
              {busy ? translate('saving') : translate('save')}
            </button>
            <p className="text-xs text-muted-foreground">{translate('clearHelp')}</p>
          </div>
        </form>
      )}
    </section>
  )
}
