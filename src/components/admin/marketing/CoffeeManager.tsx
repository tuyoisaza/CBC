'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Coffee, CheckCircle2 } from 'lucide-react'

interface CoffeeRecord {
  id: string
  name: string
  originRegion: string
  originCountry: string
  originFarm?: string
  variety?: string
  process?: string
  roast?: string
  tastingNotes: string[]
  story?: string
  active: boolean
  createdAt: string
}

export function CoffeeManager({
  coffees,
  activeCoffeeId,
}: {
  coffees: CoffeeRecord[]
  activeCoffeeId?: string
}) {
  const [showForm, setShowForm] = useState(!activeCoffeeId)
  const [saving, setSaving]     = useState(false)
  const [notes, setNotes]       = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const fd = new FormData(e.currentTarget)
    const payload = {
      name:          fd.get('name') as string,
      originCountry: fd.get('originCountry') as string,
      originRegion:  fd.get('originRegion') as string,
      originFarm:    fd.get('originFarm') as string || undefined,
      variety:       fd.get('variety') as string || undefined,
      process:       fd.get('process') as string || undefined,
      roast:         fd.get('roast') as string || undefined,
      tastingNotes:  (fd.get('tastingNotes') as string).split(',').map((s) => s.trim()).filter(Boolean),
      story:         fd.get('story') as string || undefined,
    }

    try {
      const res = await fetch('/api/admin/coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowForm(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const active = coffees.find((c) => c.active)

  return (
    <div className="space-y-6">
      {/* Active coffee card */}
      {active && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">{active.name}</p>
                  <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-3 w-3" /> Activo
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {active.originRegion}, {active.originCountry}
                  {active.originFarm ? ` · ${active.originFarm}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-primary hover:underline"
            >
              Cambiar café
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Variedad', value: active.variety },
              { label: 'Proceso',  value: active.process },
              { label: 'Tueste',   value: active.roast },
              { label: 'Notas',    value: active.tastingNotes.join(', ') },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-medium text-foreground capitalize">{value}</p>
              </div>
            ) : null)}
          </div>

          {active.story && (
            <p className="mt-4 text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3">
              {active.story}
            </p>
          )}
        </div>
      )}

      {/* New coffee form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-5">
            {activeCoffeeId ? 'Registrar nuevo micro-lote' : 'Configura el café actual'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField name="name"          label="Nombre del café *" required placeholder="Geisha de Los Altos" />
              <FormField name="originCountry" label="País"               placeholder="México" defaultValue="México" />
              <FormField name="originRegion"  label="Región *"           required placeholder="Chiapas / Veracruz / Oaxaca" />
              <FormField name="originFarm"    label="Finca / Cooperativa"  placeholder="Finca Los Altos" />
              <FormField name="variety"       label="Variedad"           placeholder="Geisha / Bourbon / Typica" />
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Proceso</label>
                <select name="process" className="input-field">
                  <option value="">Seleccionar</option>
                  {['Natural', 'Lavado', 'Honey', 'Anaeróbico'].map((p) => (
                    <option key={p} value={p.toLowerCase()}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Tueste</label>
                <select name="roast" className="input-field">
                  <option value="medio">Medio</option>
                  <option value="claro">Claro</option>
                  <option value="oscuro">Oscuro</option>
                  <option value="medio-claro">Medio-claro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Notas de cata * <span className="normal-case font-normal text-muted-foreground">(separadas por coma)</span>
              </label>
              <input
                name="tastingNotes" required
                placeholder="durazno, chocolate amargo, flor de naranja"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Historia / Curaduría <span className="normal-case font-normal text-muted-foreground">(para la Tarjeta de Curaduría)</span>
              </label>
              <textarea
                name="story" rows={3}
                placeholder="Por qué elegí este café, qué lo hace especial..."
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={saving}
                className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar y activar café'}
              </button>
              {activeCoffeeId && (
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* History */}
      {coffees.filter((c) => !c.active).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Micro-lotes anteriores
          </h2>
          <div className="space-y-2">
            {coffees.filter((c) => !c.active).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.originRegion} · {c.tastingNotes.join(', ')}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString('es-MX')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({
  name, label, required, placeholder, defaultValue,
}: {
  name: string; label: string; required?: boolean
  placeholder?: string; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        name={name} required={required} placeholder={placeholder}
        defaultValue={defaultValue} className="input-field"
      />
    </div>
  )
}
