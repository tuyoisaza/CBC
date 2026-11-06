'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function NewLeadForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createQuote, setCreateQuote] = useState(true)
  const inputClass = 'mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(form), quantity: Number(form.get('quantity')) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el lead.')
      router.push(`/admin/sales/leads/${encodeURIComponent(data.id)}${createQuote ? '/quotes/new' : ''}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar el lead.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6">
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Contacto y oportunidad</legend>
        <label className="text-sm">Empresa<input name="companyName" required minLength={2} maxLength={100} className={inputClass} /></label>
        <label className="text-sm">Nombre del contacto<input name="contactName" required minLength={2} maxLength={100} className={inputClass} /></label>
        <label className="text-sm">Correo<input name="email" type="email" required maxLength={120} className={inputClass} /></label>
        <label className="text-sm">WhatsApp<input name="whatsapp" type="tel" required pattern="\+?[0-9]{8,15}" title="De 8 a 15 dígitos, con código de país y sin espacios" placeholder="+525512345678" className={inputClass} /></label>
        <label className="text-sm">Tipo de caja<select name="boxType" defaultValue="prensa" className={inputClass}><option value="prensa">Prensa francesa</option><option value="moka">Moka italiana</option><option value="mix">Mixto</option></select></label>
        <label className="text-sm">Cantidad<input name="quantity" type="number" required min={1} max={100000} step={1} defaultValue={10} className={inputClass} /></label>
        <label className="text-sm">Ocasión<select name="occasion" defaultValue="otro" className={inputClass}><option value="fin-de-ano">Fin de año</option><option value="dia-del-amor">Día del amor</option><option value="dia-del-trabajo">Día del trabajo</option><option value="onboarding">Bienvenida</option><option value="cliente">Regalo a cliente</option><option value="otro">Otra</option></select></label>
        <label className="text-sm sm:col-span-2">Mensaje o notas<textarea name="message" maxLength={1000} rows={4} className={inputClass} /></label>
      </fieldset>
      <p className="text-xs text-muted-foreground">Si el WhatsApp ya está registrado, el lead se vincula a ese cliente y conserva sus datos. Crear un lead aquí no envía mensajes al cliente.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={createQuote} disabled={saving} onChange={event => setCreateQuote(event.target.checked)} />Crear una cotización después de guardar el lead</label>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Guardando…' : createQuote ? 'Crear lead y cotizar' : 'Crear lead'}</button>
        <Link href="/admin/sales/leads" className="text-sm text-muted-foreground hover:underline">Cancelar</Link>
      </div>
    </form>
  )
}
