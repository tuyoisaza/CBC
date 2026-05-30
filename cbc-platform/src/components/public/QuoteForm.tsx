'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'

const RFC_REGEX = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/

const REGIMENES = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '626', label: '626 — Régimen Simplificado de Confianza' },
]

const USO_CFDI = [
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'P01', label: 'P01 — Por definir' },
]

export function QuoteForm() {
  const t = useTranslations('quote')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [rfcError, setRfcError] = useState('')

  function validateRfc(value: string) {
    if (!value) { setRfcError(''); return }
    const upper = value.toUpperCase().replace(/\s/g, '')
    if (!RFC_REGEX.test(upper)) {
      setRfcError('RFC inválido. Formato: AAAA######XXX')
    } else {
      setRfcError('')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    const form = e.currentTarget
    const fd   = new FormData(form)

    let logoUrl: string | undefined

    // Upload logo if provided
    if (logoFile) {
      try {
        const upRes  = await fetch(`/api/upload?filename=${encodeURIComponent(logoFile.name)}&type=${encodeURIComponent(logoFile.type)}`)
        const { uploadUrl, publicUrl } = await upRes.json()
        await fetch(uploadUrl, { method: 'PUT', body: logoFile, headers: { 'Content-Type': logoFile.type } })
        logoUrl = publicUrl
      } catch {
        console.error('Logo upload failed')
      }
    }

    const payload = {
      companyName:        fd.get('companyName') as string,
      contactName:        fd.get('contactName') as string,
      email:              fd.get('email') as string,
      whatsapp:           fd.get('whatsapp') as string,
      boxType:            fd.get('boxType') as string,
      quantity:           fd.get('quantity') as string,
      occasion:           fd.get('occasion') as string,
      message:            fd.get('message') as string || undefined,
      logoUrl,
      rfc:                (fd.get('rfc') as string)?.toUpperCase().replace(/\s/g,'') || undefined,
      razonSocial:        fd.get('razonSocial') as string || undefined,
      codigoPostalFiscal: fd.get('codigoPostalFiscal') as string || undefined,
      regimenFiscal:      fd.get('regimenFiscal') as string || undefined,
      usoCfdi:            fd.get('usoCfdi') as string || undefined,
      emailFacturacion:   fd.get('emailFacturacion') as string || undefined,
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-foreground">{t('successTitle')}</h2>
        <p className="mt-2 text-muted-foreground">{t('successBody')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Company info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground uppercase tracking-wider pb-2 border-b border-border w-full">
          Información de contacto
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="companyName" label={t('company')} required />
          <Field name="contactName" label={t('contact')} required />
          <Field name="email"    label={t('email')}    type="email" required />
          <Field name="whatsapp" label={t('whatsapp')} type="tel"   required placeholder="+52 55 1234 5678" />
        </div>
      </fieldset>

      {/* Order */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground uppercase tracking-wider pb-2 border-b border-border w-full">
          Detalles del pedido
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('boxType')} *</label>
            <select name="boxType" required className="input-field">
              <option value="prensa">{t('boxPrens')}</option>
              <option value="moka">{t('boxMoka')}</option>
              <option value="mix">{t('boxMix')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('quantity')} *</label>
            <select name="quantity" required className="input-field">
              <option value="10-14">10 – 14 cajas</option>
              <option value="15-30">15 – 30 cajas ⭐ clase incluida</option>
              <option value="31-50">31 – 50 cajas</option>
              <option value="50+">50+ cajas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('occasion')} *</label>
            <select name="occasion" required className="input-field">
              <option value="fin-de-ano">{t('occasionFin')}</option>
              <option value="dia-del-amor">{t('occasionAmor')}</option>
              <option value="dia-del-trabajo">{t('occasionTrab')}</option>
              <option value="onboarding">{t('occasionOnb')}</option>
              <option value="cliente">{t('occasionClient')}</option>
              <option value="otro">{t('occasionOtro')}</option>
            </select>
          </div>
        </div>

        {/* Logo upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('logo')}</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
              <Upload className="h-4 w-4" />
              {logoFile ? logoFile.name : 'Subir archivo'}
              <input
                type="file"
                accept=".png,.svg,.jpg,.jpeg"
                className="sr-only"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {logoFile && <span className="text-xs text-green-600">✓ Listo</span>}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('message')}</label>
          <textarea
            name="message"
            rows={3}
            maxLength={400}
            className="input-field resize-none"
            placeholder="Ej: Feliz navidad de parte de todo el equipo de..."
          />
        </div>
      </fieldset>

      {/* SAT fiscal */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground uppercase tracking-wider pb-2 border-b border-border w-full">
          {t('rfcSection')} <span className="text-xs font-normal text-muted-foreground ml-2">Requerido para emitir CFDI</span>
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Field
              name="rfc"
              label={t('rfc')}
              placeholder="ABC123456789"
              onChange={(e) => validateRfc(e.target.value)}
              className="uppercase"
            />
            {rfcError && <p className="mt-1 text-xs text-destructive">{rfcError}</p>}
          </div>
          <Field name="razonSocial" label={t('razonSocial')} placeholder="EMPRESA SA DE CV" />
          <Field name="codigoPostalFiscal" label={t('cpFiscal')} placeholder="11800" maxLength={5} />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('regimenFiscal')}</label>
            <select name="regimenFiscal" className="input-field">
              {REGIMENES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('usoCfdi')}</label>
            <select name="usoCfdi" className="input-field">
              {USO_CFDI.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <Field name="emailFacturacion" label={t('emailFacturacion')} type="email" placeholder="facturacion@empresa.com" />
        </div>
      </fieldset>

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('errorBody')}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading' || !!rfcError}
        className="w-full rounded-lg bg-primary py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'loading' ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}

// Reusable field component
function Field({
  name, label, type = 'text', required, placeholder, onChange, className, maxLength,
}: {
  name: string; label: string; type?: string; required?: boolean
  placeholder?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string; maxLength?: number
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        placeholder={placeholder} onChange={onChange} maxLength={maxLength}
        className={`input-field ${className ?? ''}`}
      />
    </div>
  )
}
