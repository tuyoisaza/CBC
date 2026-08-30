'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'

export function SettingsForm({
  logoUrl: initialLogoUrl,
  logoSize: initialLogoSize,
  logoAlignment: initialLogoAlignment,
  logoLink: initialLogoLink,
  singlePurchaseMarkup: initialMarkup,
  wholesaleMarkup: initialWholesaleMarkup,
}: {
  logoUrl: string
  logoSize: string
  logoAlignment: string
  logoLink: string
  singlePurchaseMarkup: string
  wholesaleMarkup: string
}) {
  const [logoUrl, setLogoUrl]         = useState(initialLogoUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoSize, setLogoSize] = useState(initialLogoSize)
  const [logoAlignment, setLogoAlignment] = useState(initialLogoAlignment)
  const [logoLink, setLogoLink] = useState(initialLogoLink)
  const [savingLogoConfig, setSavingLogoConfig] = useState<string | null>(null)
  const [markup, setMarkup] = useState(initialMarkup)
  const [savingMarkup, setSavingMarkup] = useState(false)
  const [wholesaleMarkup, setWholesaleMarkup] = useState(initialWholesaleMarkup)
  const [savingWholesaleMarkup, setSavingWholesaleMarkup] = useState(false)
  const router = useRouter()

  async function saveLogoConfig(key: string, value: string) {
    setSavingLogoConfig(key)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      router.refresh()
    } finally {
      setSavingLogoConfig(null)
    }
  }

  async function saveMarkup() {
    setSavingMarkup(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'single_purchase_markup', value: markup }),
      })
      router.refresh()
    } finally {
      setSavingMarkup(false)
    }
  }

  async function saveWholesaleMarkup() {
    setSavingWholesaleMarkup(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'wholesale_markup_pct', value: wholesaleMarkup }),
      })
      router.refresh()
    } finally {
      setSavingWholesaleMarkup(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const params = new URLSearchParams({ filename: file.name, type: file.type, folder: 'logo' })
      const res = await fetch(`/api/upload?${params}`, { method: 'POST', body: file, headers: { 'Content-Type': file.type } })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Upload failed')
      setLogoUrl(body.publicUrl)
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site_logo_url', value: body.publicUrl }),
      })
      router.refresh()
    } catch (err: any) {
      console.error('Logo upload failed', err)
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Logo del sitio</h2>
        </div>
        <div className="p-5 space-y-4">
          {logoUrl && (
            <div className="relative inline-block">
              <img src={logoUrl} alt="Logo" className="h-16 rounded-lg border border-border" />
              <button
                type="button"
                onClick={async () => {
                  setLogoUrl('')
                  await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'site_logo_url', value: '' }),
                  })
                  router.refresh()
                }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs hover:bg-red-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors w-fit">
            <Upload className="h-4 w-4" />
            {uploadingLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Se mostrará en la página principal. PNG, JPG o SVG. Recomendado: fondo transparente, 400px de ancho.
          </p>

          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tamaño</label>
                <select
                  value={logoSize}
                  onChange={(e) => { setLogoSize(e.target.value); saveLogoConfig('logo_size', e.target.value) }}
                  disabled={savingLogoConfig === 'logo_size'}
                  className="input-field text-xs py-1.5"
                >
                  <option value="small">Pequeño</option>
                  <option value="medium">Mediano</option>
                  <option value="large">Grande</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Alineación</label>
                <select
                  value={logoAlignment}
                  onChange={(e) => { setLogoAlignment(e.target.value); saveLogoConfig('logo_alignment', e.target.value) }}
                  disabled={savingLogoConfig === 'logo_alignment'}
                  className="input-field text-xs py-1.5"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Enlace (opcional)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={logoLink}
                  onChange={(e) => setLogoLink(e.target.value)}
                  placeholder="https://..."
                  className="input-field flex-1 text-xs"
                />
                <button
                  onClick={() => saveLogoConfig('logo_link', logoLink)}
                  disabled={savingLogoConfig === 'logo_link'}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingLogoConfig === 'logo_link' ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Single Purchase Markup */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Compra individual</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Porcentaje de aumento sobre el precio B2B para la compra de 1 unidad en la página de producto.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Margen %</label>
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                min={0}
                max={500}
                className="input-field w-32 text-sm"
              />
            </div>
            <button
              onClick={saveMarkup}
              disabled={savingMarkup}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingMarkup ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </section>

      {/* Wholesale Markup */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Pedido personalizado (mayoreo)</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Porcentaje de aumento sobre el precio base para pedidos de mayoreo (10+ unidades) en el cotizador.
            Déjalo en 0% para vender al costo base + IVA; súbelo si quieres margen también en mayoreo.
            Normalmente debe ser menor que el margen de compra individual.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Margen %</label>
              <input
                type="number"
                value={wholesaleMarkup}
                onChange={(e) => setWholesaleMarkup(e.target.value)}
                min={0}
                max={500}
                className="input-field w-32 text-sm"
              />
            </div>
            <button
              onClick={saveWholesaleMarkup}
              disabled={savingWholesaleMarkup}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingWholesaleMarkup ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
