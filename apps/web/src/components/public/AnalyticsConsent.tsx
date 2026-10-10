'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { t } from '@/lib/i18n'

type Consent = 'granted' | 'denied' | null
type ConsentValue = 'granted' | 'denied'
type GtagCall = [command: string, ...parameters: unknown[]]

type AnalyticsWindow = Window & {
  dataLayer?: GtagCall[]
  gtag?: (...args: GtagCall) => void
  clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] }
  __cbcGoogleConfigured?: boolean
}

const CONSENT_STORAGE_KEY = 'cbc-analytics-consent-v1'
const EXCLUDED_PATHS = ['/admin', '/login', '/api', '/health', '/tracking', '/en/tracking']
let lastTrackedPath: string | null = null

function isExcludedPath(path: string) {
  return EXCLUDED_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

function clearAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0]?.trim())
    .filter((name): name is string => {
      if (!name) return false
      return /^_ga(?:_|$)/.test(name) || name === '_gid' || name === '_gat' || name === '_clck' || name === '_clsk'
    })
  const hostname = window.location.hostname
  const domains = ['', `; domain=${hostname}`]
  if (hostname === 'coffeebunncafe.com' || hostname.endsWith('.coffeebunncafe.com')) {
    domains.push('; domain=.coffeebunncafe.com')
  }

  for (const name of cookieNames) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax`
    }
  }
}

function updateProviderConsent(value: ConsentValue) {
  const analyticsWindow = window as AnalyticsWindow
  const granted = value === 'granted'

  analyticsWindow.gtag?.('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  analyticsWindow.clarity?.('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: granted ? 'granted' : 'denied',
  })
}

function loadGoogleAnalytics(measurementId: string) {
  const analyticsWindow = window as AnalyticsWindow
  analyticsWindow.dataLayer ??= []
  analyticsWindow.gtag ??= (...args: GtagCall) => analyticsWindow.dataLayer?.push(args)

  if (!analyticsWindow.__cbcGoogleConfigured) {
    analyticsWindow.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
    analyticsWindow.gtag('js', new Date())
    analyticsWindow.gtag('config', measurementId, { send_page_view: false })
    analyticsWindow.__cbcGoogleConfigured = true
  }

  if (!document.getElementById('cbc-google-analytics-script')) {
    const script = document.createElement('script')
    script.id = 'cbc-google-analytics-script'
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    document.head.appendChild(script)
  }
}

function loadClarity(projectId: string) {
  const analyticsWindow = window as AnalyticsWindow
  if (!analyticsWindow.clarity) {
    const clarity = ((...args: unknown[]) => {
      clarity.q ??= []
      clarity.q.push(args)
    }) as NonNullable<AnalyticsWindow['clarity']>
    clarity.q = []
    analyticsWindow.clarity = clarity
  }

  if (!document.getElementById('cbc-clarity-script')) {
    const script = document.createElement('script')
    script.id = 'cbc-clarity-script'
    script.async = true
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`
    document.head.appendChild(script)
  }
}

function getSafeReferrer() {
  if (!document.referrer) return undefined
  try {
    const referrer = new URL(document.referrer)
    return referrer.origin === window.location.origin
      ? `${referrer.origin}${referrer.pathname}`
      : referrer.origin
  } catch {
    return undefined
  }
}

export function AnalyticsConsent() {
  const pathname = usePathname() || '/'
  const [consent, setConsent] = useState<Consent>(null)
  const [initialized, setInitialized] = useState(false)
  const [analyticsSettings, setAnalyticsSettings] = useState<{ googleMeasurementId: string; clarityProjectId: string } | null>(null)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const lang = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'es'
  const googleMeasurementId = analyticsSettings?.googleMeasurementId || ''
  const clarityProjectId = analyticsSettings?.clarityProjectId || ''
  const hasAnalytics = Boolean(googleMeasurementId || clarityProjectId)
  const excludedPath = isExcludedPath(pathname)

  useEffect(() => {
    if (excludedPath || analyticsSettings) return
    let active = true
    fetch('/api/settings/analytics', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('analytics-settings-unavailable')
        return response.json()
      })
      .then((settings: { googleMeasurementId?: unknown; clarityProjectId?: unknown }) => {
        if (!active) return
        setAnalyticsSettings({
          googleMeasurementId: typeof settings.googleMeasurementId === 'string' ? settings.googleMeasurementId : '',
          clarityProjectId: typeof settings.clarityProjectId === 'string' ? settings.clarityProjectId : '',
        })
      })
      .catch(() => {
        if (active) setAnalyticsSettings({ googleMeasurementId: '', clarityProjectId: '' })
      })
    return () => { active = false }
  }, [analyticsSettings, excludedPath])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CONSENT_STORAGE_KEY)
      if (saved === 'granted' || saved === 'denied') setConsent(saved)
    } catch {
      // The banner remains usable for this visit if browser storage is disabled.
    }
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (!initialized || !hasAnalytics) return

    const canTrack = consent === 'granted' && !excludedPath
    if (!canTrack) {
      updateProviderConsent('denied')
      lastTrackedPath = null
      return
    }

    if (googleMeasurementId) {
      loadGoogleAnalytics(googleMeasurementId)
      updateProviderConsent('granted')
      const analyticsWindow = window as AnalyticsWindow
      if (analyticsWindow.gtag && lastTrackedPath !== pathname) {
        const pageReferrer = lastTrackedPath
          ? `${window.location.origin}${lastTrackedPath}`
          : getSafeReferrer()
        analyticsWindow.gtag('event', 'page_view', {
          page_title: document.title,
          page_location: `${window.location.origin}${pathname}`,
          ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
        })
      }
    }

    if (clarityProjectId) {
      loadClarity(clarityProjectId)
      updateProviderConsent('granted')
    }

    lastTrackedPath = pathname
  }, [clarityProjectId, consent, googleMeasurementId, hasAnalytics, initialized, pathname, excludedPath])

  function saveConsent(value: ConsentValue) {
    setConsent(value)
    setPreferencesOpen(false)
    lastTrackedPath = null
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
    } catch {
      // The in-memory choice still applies until the page is closed.
    }

    if (value === 'denied') {
      updateProviderConsent('denied')
      clearAnalyticsCookies()
    }
  }

  if (!initialized || !analyticsSettings || !hasAnalytics || excludedPath) return null

  const providerList = [
    googleMeasurementId ? 'Google Analytics 4' : null,
    clarityProjectId ? 'Microsoft Clarity' : null,
  ].filter(Boolean)
  const providers = providerList.length === 2
    ? (lang === 'es' ? `${providerList[0]} y ${providerList[1]}` : `${providerList[0]} and ${providerList[1]}`)
    : providerList[0]
  const descriptionKey = providerList.length === 2
    ? 'public.analyticsConsent.descriptionBoth'
    : googleMeasurementId
      ? 'public.analyticsConsent.descriptionGoogle'
      : 'public.analyticsConsent.descriptionClarity'

  return (
    <>
      {consent !== null && !preferencesOpen && (
        <button
          type="button"
          onClick={() => setPreferencesOpen(true)}
          className="fixed bottom-4 right-4 z-50 min-h-11 rounded-full border border-gray-600 bg-cbc-black px-4 py-2 text-sm font-semibold text-cbc-cream shadow-lg transition-colors hover:border-cbc-yellow hover:text-cbc-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-cbc-yellow"
        >
          {t(lang, 'public.analyticsConsent.preferences')}
        </button>
      )}

      {(consent === null || preferencesOpen) && (
        <section
          role="region"
          aria-labelledby="analytics-consent-title"
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-2xl rounded-xl border border-gray-700 bg-cbc-black p-5 text-cbc-cream shadow-2xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="analytics-consent-title" className="text-lg font-bold">
                {t(lang, 'public.analyticsConsent.title')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                {t(lang, descriptionKey).replace('{providers}', providers ?? '')}
                {' '}
                <a
                  href={lang === 'es' ? '/politica-de-privacidad' : '/en/privacy-policy'}
                  className="font-semibold text-cbc-yellow underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cbc-yellow"
                >
                  {t(lang, 'public.analyticsConsent.privacy')}
                </a>
              </p>
            </div>
            {preferencesOpen && (
              <button
                type="button"
                onClick={() => setPreferencesOpen(false)}
                className="min-h-11 min-w-11 rounded-md text-sm text-gray-300 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cbc-yellow"
              >
                {t(lang, 'public.analyticsConsent.close')}
              </button>
            )}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => saveConsent('denied')}
              className="min-h-11 rounded-md border border-gray-600 px-5 py-2 text-sm font-semibold text-cbc-cream transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cbc-yellow"
            >
              {t(lang, 'public.analyticsConsent.reject')}
            </button>
            <button
              type="button"
              onClick={() => saveConsent('granted')}
              className="min-h-11 rounded-md bg-cbc-yellow px-5 py-2 text-sm font-bold text-black transition-colors hover:bg-cbc-yellow/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cbc-yellow"
            >
              {t(lang, 'public.analyticsConsent.accept')}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
