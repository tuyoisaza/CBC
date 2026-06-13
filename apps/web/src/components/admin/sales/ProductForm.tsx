'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Upload, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ProductFormProps {
  product?: {
    id: string
    slug: string
    name: string
    subtitle: string | null
    description: string
    price: number
    imageUrl: string | null
    features: string[]
    active: boolean
    sortOrder: number
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
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [features, setFeatures] = useState<string[]>(product?.features ?? [''])
  const [active, setActive] = useState(product?.active ?? true)
  const [sortOrder, setSortOrder] = useState(product?.sortOrder ?? 0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const params = new URLSearchParams({
        filename: file.name,
        type: file.type,
      })
      const res = await fetch(`/api/upload?${params}`)
      const { uploadUrl, publicUrl } = await res.json()

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      setImageUrl(publicUrl)
    } catch {
      setError('Error al subir la imagen')
    } finally {
      setUploading(false)
    }
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
      imageUrl: imageUrl || undefined,
      features: features.filter((f) => f.trim()),
      active,
      sortOrder,
    }

    try {
      const url = isEditing
        ? `/api/admin/products?id=${product!.id}`
        : '/api/admin/products'

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      router.push('/admin/sales/products')
      router.refresh()
    } catch (err: any) {
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
          <label className="block text-sm font-medium text-foreground mb-1.5">Imagen</label>
          {imageUrl && (
            <div className="mb-3 rounded-lg overflow-hidden border border-border w-48">
              <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? 'Subiendo...' : imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml" onChange={handleImageUpload}
                className="hidden" disabled={uploading} />
            </label>
            {imageUrl && (
              <button type="button" onClick={() => setImageUrl('')}
                className="text-sm text-muted-foreground hover:text-destructive">
                Quitar
              </button>
            )}
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
