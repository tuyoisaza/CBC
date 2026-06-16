'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface ApiKeySetting {
  key: string
  label: string
  hint: string
  prefix: string
}

export function SettingsForm({
  apiKeys,
  apiKeyValues,
  brandVoice,
  brandVoiceUpdatedAt,
  openaiKeyPurpose: initialPurpose,
}: {
  apiKeys: ApiKeySetting[]
  apiKeyValues: Record<string, string>
  brandVoice: string
  brandVoiceUpdatedAt: string
  openaiKeyPurpose: string
}) {
  const [values, setValues]           = useState(apiKeyValues)
  const [voice, setVoice]             = useState(brandVoice)
  const [revealed, setRevealed]       = useState<Record<string, boolean>>({})
  const [saving, setSaving]           = useState<string | null>(null)
  const [saved, setSaved]             = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen]     = useState(false)
  const [purpose, setPurpose]         = useState(initialPurpose)
  const [purposeSaving, setPurposeSaving] = useState(false)
  const router = useRouter()

  function mask(value: string) {
    if (!value) return ''
    return value.slice(0, 6) + '••••••••' + value.slice(-4)
  }

  async function saveKey(key: string) {
    setSaving(key)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: values[key] }),
      })
      setSaved(key)
      setTimeout(() => setSaved(null), 2500)
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  async function saveVoice() {
    setSaving('voice')
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'brand_voice_prompt', value: voice }),
      })
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'brand_voice_updated_at', value: new Date().toISOString() }),
      })
      setSaved('voice')
      setTimeout(() => setSaved(null), 2500)
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  async function savePurpose(value: string) {
    setPurposeSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'openai_key_purpose', value }),
      })
      router.refresh()
    } finally {
      setPurposeSaving(false)
    }
  }

  // Group API keys by service
  const groups = [
    { label: 'Inteligencia Artificial',    keys: ['anthropic_api_key', 'openai_api_key'] },
    { label: 'Redes Sociales (Meta)',       keys: ['meta_access_token', 'meta_instagram_account_id', 'meta_facebook_page_id'] },
    { label: 'LinkedIn',                   keys: ['linkedin_access_token', 'linkedin_person_urn'] },
    { label: 'Pagos (Stripe)',             keys: ['stripe_secret_key', 'stripe_webhook_secret'] },
    { label: 'Facturación SAT (Facturapi)',keys: ['facturapi_key'] },
    { label: 'Email (Resend)',             keys: ['resend_api_key'] },
    { label: 'WhatsApp',                   keys: ['whatsapp_token', 'whatsapp_phone_number_id'] },
  ]

  return (
    <div className="space-y-8">
      {/* API Keys */}
      {groups.map((group) => {
        const groupKeys = apiKeys.filter((k) => group.keys.includes(k.key))
        if (!groupKeys.length) return null

        return (
          <section key={group.label} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
            </div>
            <div className="divide-y divide-border">
              {groupKeys.map((setting) => {
                const isRevealed = revealed[setting.key]
                const val        = values[setting.key] || ''
                const isSaved    = saved === setting.key
                const isSaving   = saving === setting.key
                const hasValue   = val.length > 0

                return (
                  <div key={setting.key} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <label className="block text-sm font-medium text-foreground mb-1">
                          {setting.label}
                          {hasValue
                            ? <><span className="inline-flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400 font-normal"><Check className="h-3 w-3" /> Configurado</span>
                              {setting.key === 'openai_api_key' && purpose === 'both' && (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400 font-normal">Usando también para copy</span>
                              )}</>
                            : <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-normal"><AlertCircle className="h-3 w-3" /> Sin configurar</span>}
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          {setting.key === 'openai_api_key' && purpose === 'both'
                            ? 'Para DALL-E 3 y GPT — generación de imágenes y copy'
                            : setting.hint}
                        </p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={isRevealed ? 'text' : 'password'}
                              value={isRevealed ? val : (hasValue ? mask(val) : '')}
                              onChange={(e) => {
                                if (isRevealed) setValues({ ...values, [setting.key]: e.target.value })
                              }}
                              placeholder={setting.prefix ? `${setting.prefix}...` : 'Pegar aquí...'}
                              className="input-field pr-10 font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setRevealed({ ...revealed, [setting.key]: !isRevealed })}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <button
                            onClick={() => saveKey(setting.key)}
                            disabled={isSaving || !isRevealed}
                            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            {isSaving ? '...' : isSaved ? '✓' : 'Guardar'}
                          </button>
                        </div>
                        {setting.key === 'openai_api_key' && hasValue && (
                          <div className="mt-3 flex items-center gap-3">
                            <label className="text-xs text-muted-foreground">Usar para:</label>
                            <select
                              value={purpose}
                              onChange={(e) => {
                                const val = e.target.value
                                setPurpose(val)
                                savePurpose(val)
                              }}
                              disabled={purposeSaving}
                              className="input-field text-xs py-1 px-2 w-auto"
                            >
                              <option value="image">Solo imágenes</option>
                              <option value="both">Imágenes y Copy</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Brand Voice */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setVoiceOpen(!voiceOpen)}
          className="w-full flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-foreground">Voz de marca (prompt)</h2>
            {brandVoiceUpdatedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Última edición: {new Date(brandVoiceUpdatedAt).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
          </div>
          {voiceOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {voiceOpen && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Este texto le dice a Claude cómo sonar como CBC. Edítalo una vez al trimestre si el contenido se siente fuera de tono.
            </p>
            <textarea
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              rows={12}
              className="input-field resize-y font-mono text-xs leading-relaxed"
              placeholder="Define aquí la voz y tono de CBC para la generación de contenido..."
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {voice.length} caracteres
              </p>
              <button
                onClick={saveVoice}
                disabled={saving === 'voice'}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving === 'voice' ? 'Guardando...' : saved === 'voice' ? '✓ Guardado' : 'Guardar voz de marca'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
