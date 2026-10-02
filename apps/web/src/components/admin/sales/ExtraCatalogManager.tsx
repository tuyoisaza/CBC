'use client'

import { useEffect, useState } from 'react'
import { catalogImages, saleUnit } from '@/lib/extra-catalog'

interface ExtraDraft {
  id?: string
  name: string
  slug: string
  shortDescription: string
  description: string
  images: string[]
  imageUrl?: string | null
  unitPrice: number | ''
  unitLabel: string
  unitsPerPack: number
  minQty: number
  active: boolean
  catalogVisible: boolean
  sellableStandalone: boolean
  allowedForRush: boolean
  sortOrder: number
}

const empty = (): ExtraDraft => ({ name: '', slug: '', shortDescription: '', description: '', images: [], unitPrice: '', unitLabel: 'pieza', unitsPerPack: 1, minQty: 1, active: true, catalogVisible: true, sellableStandalone: true, allowedForRush: true, sortOrder: 0 })
const API = '/api/admin/extras'

export function ExtraCatalogManager() {
  const [items, setItems] = useState<ExtraDraft[]>([])
  const [draft, setDraft] = useState<ExtraDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    try {
      const response = await fetch(API)
      if (!response.ok) throw new Error('No se pudieron cargar los extras.')
      setItems(await response.json())
    } catch (err) { setError(err instanceof Error ? err.message : 'Error de conexión.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const update = <K extends keyof ExtraDraft>(key: K, value: ExtraDraft[K]) => setDraft(current => current ? { ...current, [key]: value } : current)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!draft || busy || uploading) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { id, imageUrl: _legacy, ...data } = draft
      const response = await fetch(id ? `${API}/${id}` : API, {
        method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, slug: data.slug.trim() || null }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.details?.[0]?.message || body.error || 'No se pudo guardar el extra.')
      setDraft(null); setNotice('Extra guardado. Catálogo y cotizador actualizados.'); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al guardar.') }
    finally { setBusy(false) }
  }

  async function upload(files: FileList | null) {
    if (!files || !draft) return
    if (draft.images.length + files.length > 12) { setError('Puedes guardar hasta 12 fotografías.'); return }
    setUploading(true); setError('')
    try {
      for (const file of Array.from(files)) {
        if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Usa fotografías JPG o PNG de hasta 5 MB cada una.')
        const params = new URLSearchParams({ folder: 'extras', filename: `${crypto.randomUUID()}-${file.name}`, type: file.type })
        const response = await fetch(`/api/upload?${params}`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
        const body = await response.json()
        if (!response.ok || !body.publicUrl) throw new Error(body.error || 'No se pudo subir la fotografía.')
        setDraft(current => current ? { ...current, images: [...current.images, body.publicUrl] } : current)
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al subir fotografías.') }
    finally { setUploading(false) }
  }

  function move(index: number, direction: number) {
    if (!draft) return
    const next = index + direction
    if (next < 0 || next >= draft.images.length) return
    const images = [...draft.images]
    ;[images[index], images[next]] = [images[next], images[index]]
    update('images', images)
  }

  async function remove(item: ExtraDraft) {
    if (!item.id || busy || !window.confirm(`¿Eliminar ${item.name}? Para retirarlo del catálogo sin borrarlo, desactiva “Visible en catálogo”.`)) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`${API}/${item.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('No se pudo eliminar el extra.')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al eliminar.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Extras y catálogo B2B</h1><p className="mt-1 text-sm text-muted-foreground">Un mismo producto para el catálogo y las cotizaciones. El costo recibe el margen de mayoreo y después IVA.</p></div>
      <button type="button" disabled={busy || uploading} onClick={() => { setDraft(draft ? null : empty()); setError(''); setNotice('') }} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">{draft ? 'Cancelar' : 'Nuevo'}</button>
    </header>
    {error && <p role="alert" className="rounded-md border border-red-300 p-3 text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-600">{notice}</p>}
    {draft && <form onSubmit={save} className="space-y-6 rounded-xl border border-border bg-card p-5">
      <fieldset disabled={busy || uploading} className="space-y-6 disabled:opacity-60">
        <h2 className="text-lg font-semibold">{draft.id ? 'Editar ficha' : 'Nueva ficha'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Nombre<input required maxLength={200} value={draft.name} onChange={event => update('name', event.target.value)} className="input-field mt-1 w-full" /></label>
          <label className="text-sm">Enlace corto (opcional)<input value={draft.slug || ''} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} placeholder="filtros-paquete-100" onChange={event => update('slug', event.target.value)} className="input-field mt-1 w-full" /></label>
        </div>
        <label className="block text-sm">Descripción corta<textarea aria-label="Descripción corta" rows={2} maxLength={320} value={draft.shortDescription || ''} onChange={event => update('shortDescription', event.target.value)} className="input-field mt-1 w-full" /></label>
        <label className="block text-sm">Descripción completa<textarea aria-label="Descripción completa" rows={10} maxLength={20000} value={draft.description || ''} onChange={event => update('description', event.target.value)} placeholder="Contenido, materiales, medidas, compatibilidad, usos y condiciones. Los párrafos se conservan en la ficha pública." className="input-field mt-1 w-full" /></label>
        <section aria-label="Fotografías" className="space-y-3">
          <h3 className="font-semibold">Fotografías · {draft.images.length}/12</h3>
          <p className="text-xs text-muted-foreground">La primera es la portada. Presentación 16:9; usa imágenes HD. JPG o PNG, máximo 5 MB por foto.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {draft.images.map((image, index) => <div key={`${image}-${index}`} className="rounded-lg border border-border p-2">
              <img src={image} alt={`Fotografía ${index + 1}`} className="aspect-video w-full object-contain" />
              <p className="my-2 text-xs">{index === 0 ? 'Portada' : `Fotografía ${index + 1}`}</p>
              <div className="flex justify-between gap-1 text-xs">
                <button type="button" aria-label={`Mover fotografía ${index + 1} antes`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded border p-1 disabled:opacity-30">←</button>
                <button type="button" aria-label={`Mover fotografía ${index + 1} después`} disabled={index === draft.images.length - 1} onClick={() => move(index, 1)} className="rounded border p-1 disabled:opacity-30">→</button>
                <button type="button" aria-label={`Quitar fotografía ${index + 1}`} onClick={() => update('images', draft.images.filter((_, i) => i !== index))} className="rounded border p-1 text-red-600">Quitar</button>
              </div>
            </div>)}
          </div>
          <label className="block text-sm">Añadir fotografías<input type="file" multiple accept="image/png,image/jpeg" className="mt-2 block text-sm" onChange={event => { void upload(event.target.files); event.target.value = '' }} /></label>
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="text-sm">Costo unitario (sin IVA)<input aria-label="Costo unitario (sin IVA)" required type="number" inputMode="decimal" min={0} step="any" value={draft.unitPrice} onChange={event => update('unitPrice', event.target.value === '' ? '' : Number(event.target.value))} className="input-field mt-1 w-full" /></label><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.unitPrice === 0} onChange={event => update('unitPrice', event.target.checked ? 0 : '')} />Gratis</label></div>
          <label className="text-sm">Unidad de venta<input required maxLength={80} value={draft.unitLabel} onChange={event => update('unitLabel', event.target.value)} placeholder="pieza / paquete / servicio" className="input-field mt-1 w-full" /></label>
          <label className="text-sm">Piezas por unidad de venta<input required type="number" min={1} max={100000} step={1} value={draft.unitsPerPack} onChange={event => update('unitsPerPack', Number(event.target.value))} className="input-field mt-1 w-full" /></label>
          <label className="text-sm">Pedido mínimo<input required type="number" min={1} max={100000} step={1} value={draft.minQty} onChange={event => update('minQty', Number(event.target.value))} className="input-field mt-1 w-full" /></label>
        </div>
        <p className="text-xs text-muted-foreground">El costo y la cantidad se refieren a la unidad de venta: 50 paquetes de 100 filtros son 50 unidades cotizadas, con 5,000 filtros en total.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([['active', 'Activo'], ['catalogVisible', 'Visible en catálogo'], ['sellableStandalone', 'Se puede cotizar sin un kit'], ['allowedForRush', 'Permitido en pedidos urgentes']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft[key]} onChange={event => update(key, event.target.checked)} />{label}</label>)}
        </div>
        <label className="block max-w-xs text-sm">Orden<input type="number" step={1} value={draft.sortOrder} onChange={event => update('sortOrder', Number(event.target.value))} className="input-field mt-1 w-full" /></label>
        <button type="submit" className="rounded-lg bg-primary px-5 py-2 font-semibold text-primary-foreground">{busy ? 'Guardando...' : draft.id ? 'Guardar cambios' : 'Crear'}</button>
      </fieldset>
      {uploading && <p role="status" className="text-sm">Subiendo fotografías…</p>}
    </form>}
    {loading ? <p>Cargando…</p> : !items.length ? <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No hay extras aún</p> : <div className="grid gap-4 md:grid-cols-2">
      {items.map(item => <article key={item.id} className="rounded-xl border border-border bg-card p-5">
        <div className="flex gap-4">
          {catalogImages(item)[0] && <img src={catalogImages(item)[0]} alt={item.name} className="aspect-video w-28 shrink-0 self-start rounded object-contain" />}
          <div className="min-w-0"><h2 className="font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{saleUnit(item)} · Mínimo {item.minQty ?? 1}</p><p className="text-sm">{item.unitPrice === 0 ? 'Gratis' : `$${item.unitPrice} de costo sin IVA`}</p><p className="mt-1 text-xs text-muted-foreground">{item.active === false ? 'Inactivo' : item.catalogVisible === false ? 'Solo cotizador' : 'Visible en catálogo'}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button type="button" disabled={busy || uploading} onClick={() => { setDraft({ ...empty(), ...item, slug: item.slug || '', images: catalogImages(item) }); setError(''); setNotice('') }} className="rounded border border-border px-3 py-1.5">Editar</button>
          {item.active !== false && item.catalogVisible !== false && <a href={`/catalogo-b2b/extra/${encodeURIComponent(item.slug || item.id || '')}`} target="_blank" rel="noopener noreferrer" className="rounded border border-border px-3 py-1.5">Ver ficha</a>}
          <button type="button" disabled={busy || uploading} onClick={() => void remove(item)} className="rounded border border-red-300 px-3 py-1.5 text-red-600">Eliminar</button>
        </div>
      </article>)}
    </div>}
  </div>
}
