'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Upload, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Method {
  id: string
  name: string
}

interface ProductFormProps {
  product?: {
    id: string
    slug: string
    name: string
    subtitle: string | null
    description: string
    price: number
    images: string[]
    videos: { url: string; title?: string }[]
    features: string[]
    active: boolean
    sortOrder: number
    methodId: string | null
  }
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!product

  const [slug, setSlug] = useState(product?.slug ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product?.price ?? 799)
  const [images, setImages] = useState<string[]>(product?.images ?? [])
  const [videos, setVideos] = useState<{ url: string; title?: string }[]>(product?.videos ?? [])
  const [features, setFeatures] = useState<string[]>(product?.features ?? [''])
  const [active, setActive] = useState(product?.active ?? true)
  const [sortOrder, setSortOrder] = useState(product?.sortOrder ?? 0)
  const [methodId, setMethodId] = useState<string | null>(product?.methodId ?? null)
  const [methods, setMethods] = useState<Method[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log(`[product-form] mount id=${product?.id || 'new'} images=${product?.images?.length ?? 0} videos=${product?.videos?.length ?? 0}`)
    fetch('/api/admin/methods')
      .then((res) => res.json())
      .then((data) => setMethods(data))
      .catch(() => {})
  }, [])
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoTitle, setNewVideoTitle] = useState('')
  const [error, setError] = useState('')

  function slugify(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!isEditing) setSlug(slugify(val))
  }

  function addFeature() {
    setFeatures([...features, ''])
  }

  function removeFeature(i: number) {
    setFeatures(features.filter((_, idx) => idx !== i))
  }

  function updateFeature(i: number, val: string) {
    const copy = [...features]
    copy[i] = val
    setFeatures(copy)
  }

  async function handleImagesUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileList = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    console.log(`[product-form] upload-start files=${fileList.length}`, fileList)

    setUploadingImages(true)
    try {
      const results = await Promise.all(
        Array.from(files).map(async (file) => {
          const params = new URLSearchParams({
            filename: file.name,
            type: file.type,
            folder: 'product',
          })
          const url = `/api/upload?${params}`
          console.log(`[product-form] upload-presign ${file.name} -> ${url}`)
          const res = await fetch(url)
          const body = await res.json()
          console.log(`[product-form] upload-presign-resp ${file.name}`, body)
          if (!res.ok || body.error) throw new Error(body.error || `HTTP ${res.status}`)

          const putRes = await fetch(body.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })
          if (!putRes.ok) throw new Error(`PUT ${putRes.status}`)
          console.log(`[product-form] upload-ok ${file.name} publicUrl=${body.publicUrl}`)

          return body.publicUrl
        })
      )
      setImages((prev) => [...prev, ...results])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[product-form] upload-error ${msg}`)
      setError('Error al subir imágenes')
    } finally {
      setUploadingImages(false)
    }
  }

  function addVideo() {
    const url = newVideoUrl.trim()
    const title = newVideoTitle.trim()
    console.log(`[product-form] addVideo url="${url}" title="${title}"`)
    if (!url) {
      console.log(`[product-form] addVideo skipped — empty url`)
      return
    }
    const next = [...videos, { url, title: title || undefined }]
    console.log(`[product-form] addVideo-ok videos=${next.length}`)
    setVideos(next)
    setNewVideoUrl('')
    setNewVideoTitle('')
  }

  function removeVideo(i: number) {
    setVideos(videos.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const body = {
      slug,
      name,
      subtitle: subtitle || undefined,
      description,
      price,
      images,
      videos: videos.length > 0 ? videos : undefined,
      features: features.filter((f) => f.trim()),
      active,
      sortOrder,
      methodId,
    }

    try {
      const url = isEditing
        ? `/api/admin/products?id=${product!.id}`
        : '/api/admin/products'

      console.log(`[product-form] submit ${url} images=${body.images?.length} videos=${body.videos?.length} features=${body.features?.length}`)
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error(`[product-form] submit-error HTTP ${res.status}`, data)
        throw new Error(data.error || 'Error al guardar')
      }

      console.log(`[product-form] submit-ok productId=${data.id}`)
      router.push('/admin/sales/products')
      router.refresh()
    } catch (err: any) {
      console.error(`[product-form] submit-fail ${err.message}`)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/sales/products" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
            <input value={name} onChange={(e) => handleNameChange(e.target.value)} required
              className="input-field" placeholder="Box Prensa Francesa" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-foreground mb-1.5">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required
              className="input-field" placeholder="box-prensa-francesa" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Subtítulo</label>
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
            className="input-field" placeholder="French press 350cc" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3}
            className="input-field resize-y" placeholder="Describe el producto..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Precio ($ MXN)</label>
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} required min={1}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Orden</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
              className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Método de preparación</label>
          <select value={methodId ?? ''} onChange={(e) => setMethodId(e.target.value || null)}
            className="input-field">
            <option value="">Sin método</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Características</label>
          <div className="space-y-2">
            {features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input value={f} onChange={(e) => updateFeature(i, e.target.value)}
                  className="input-field flex-1" placeholder="250g café de especialidad" />
                <button type="button" onClick={() => removeFeature(i)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addFeature}
            className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Agregar característica
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Imágenes</label>
          {images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-border w-32 h-24 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
            <Upload className="h-4 w-4" />
            {uploadingImages ? 'Subiendo...' : 'Subir imágenes'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              multiple
              onChange={handleImagesUpload}
              className="hidden"
              disabled={uploadingImages}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Videos (YouTube)</label>
          {videos.length > 0 && (
            <div className="mb-3 space-y-2">
              {videos.map((v, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="flex-1 truncate text-foreground">{v.url}</span>
                  {v.title && <span className="text-muted-foreground text-xs">— {v.title}</span>}
                  <button type="button" onClick={() => removeVideo(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)}
              className="input-field flex-1" placeholder="https://youtube.com/watch?v=..." />
            <input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)}
              className="input-field w-40" placeholder="Título (opcional)" />
            <button type="button" onClick={addVideo}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
              className="sr-only peer" />
            <div className="h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
          </label>
          <span className="text-sm text-foreground">Producto activo</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? 'Guardando...' : <Check className="h-4 w-4" />}
          {isEditing ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <Link href="/admin/sales/products"
          className="rounded-lg border border-border px-6 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
