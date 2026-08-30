'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Check, Trash2 } from 'lucide-react'

export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'image'
  required?: boolean
  // Declarative (serializable) formatter — pages are Server Components, so
  // passing a function here would crash the server→client boundary.
  format?: 'currency' | 'percent' | 'infinity'
}

function formatValue(format: Field['format'], val: any): string {
  if (val === null || val === undefined) {
    return format === 'infinity' ? '∞' : '—'
  }
  switch (format) {
    case 'currency':
      return `$${Number(val).toLocaleString('es-MX')}`
    case 'percent':
      return `${val}%`
    default:
      return String(val)
  }
}

export function EntityList({
  title,
  description,
  apiPath,
  fields,
  emptyMessage,
  uploadFolder = 'general',
}: {
  title: string
  description: string
  apiPath: string
  fields: Field[]
  emptyMessage: string
  // Subfolder passed to /api/upload for any field of type 'image'.
  uploadFolder?: string
}) {
  const [items, setItems] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [newValues, setNewValues] = useState<Record<string, any>>({})
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Persist a single field of an existing row immediately (used to auto-save
  // an image the moment it finishes uploading, without leaving edit mode or
  // clobbering other in-progress edits on the row).
  async function persistField(id: string, key: string, value: any) {
    setError(null)
    try {
      const res = await fetch(`${apiPath}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || `No se pudo guardar la imagen (HTTP ${res.status})`)
      }
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)))
      setSavedKey(`${id}:${key}`)
      setTimeout(() => setSavedKey((k) => (k === `${id}:${key}` ? null : k)), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la imagen')
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const params = new URLSearchParams({ filename: file.name, type: file.type, folder: uploadFolder })
    const res = await fetch(`/api/upload?${params}`, {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    const body = await res.json()
    if (!res.ok || body.error) throw new Error(body.error || `HTTP ${res.status}`)
    return body.publicUrl as string
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(apiPath)
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(item: any) {
    setEditingId(item.id)
    setEditValues({ ...item })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError(null)
    const body: Record<string, any> = {}
    for (const f of fields) {
      if (editValues[f.key] !== undefined) body[f.key] = editValues[f.key]
    }
    try {
      const res = await fetch(`${apiPath}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || `No se pudo guardar (HTTP ${res.status})`)
      }
      setEditingId(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este elemento?')) return
    await fetch(`${apiPath}/${id}`, { method: 'DELETE' })
    load()
  }

  async function createItem() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newValues),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || `No se pudo crear (HTTP ${res.status})`)
      }
      setShowNew(false)
      setNewValues({})
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    } finally {
      setSaving(false)
    }
  }

  function renderInput(field: Field, values: Record<string, any>, onChange: (key: string, val: any) => void, scope = 'new') {
    if (field.type === 'image') {
      const url = values[field.key] as string | null | undefined
      const busy = uploadingKey === `${scope}:${field.key}`
      const persists = scope !== 'new' // existing row → auto-save on change
      return (
        <div className="flex items-center gap-3">
          {url ? (
            <img src={url} alt="" className="h-12 w-12 rounded-md object-cover border border-border" />
          ) : (
            <div className="h-12 w-12 rounded-md border border-dashed border-border" />
          )}
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            {busy ? 'Subiendo...' : (url ? 'Cambiar' : 'Subir')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              className="hidden"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploadingKey(`${scope}:${field.key}`)
                try {
                  const uploaded = await uploadImage(file)
                  onChange(field.key, uploaded)
                  if (persists) await persistField(scope, field.key, uploaded)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Error al subir la imagen')
                } finally {
                  setUploadingKey(null)
                  e.target.value = ''
                }
              }}
            />
          </label>
          {url && (
            <button
              type="button"
              onClick={async () => {
                onChange(field.key, null)
                if (persists) await persistField(scope, field.key, null)
              }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {savedKey === `${scope}:${field.key}` && (
            <span className="text-xs text-green-600 dark:text-green-400">Guardada ✓</span>
          )}
        </div>
      )
    }
    if (field.type === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={!!values[field.key]}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
      )
    }
    if (field.type === 'number') {
      return (
        <input
          type="number"
          step="any"
          value={values[field.key] ?? ''}
          onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
          className="input-field w-full text-sm py-1"
        />
      )
    }
    return (
      <input
        type="text"
        value={values[field.key] ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="input-field w-full text-sm py-1"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <button
          onClick={() => { setShowNew(!showNew); setNewValues({}) }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {showNew ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showNew ? 'Cancelar' : 'Nuevo'}
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70"><X className="h-4 w-4" /></button>
        </div>
      )}

      {showNew && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Nuevo elemento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.filter(f => f.type !== 'boolean').map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
                {renderInput(f, newValues, (k, v) => setNewValues({ ...newValues, [k]: v }))}
              </div>
            ))}
          </div>
          {fields.filter(f => f.type === 'boolean').map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-foreground">
              {renderInput(f, newValues, (k, v) => setNewValues({ ...newValues, [k]: v }))}
              {f.label}
            </label>
          ))}
          <div className="flex justify-end">
            <button
              onClick={createItem}
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {fields.map((f) => (
                <th key={f.key} className="text-left px-5 py-3 font-semibold text-foreground">{f.label}</th>
              ))}
              <th className="text-right px-5 py-3 font-semibold text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={fields.length + 1} className="px-5 py-12 text-center text-muted-foreground">Cargando...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={fields.length + 1} className="px-5 py-12 text-center text-muted-foreground">{emptyMessage}</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                {fields.map((f) => (
                  <td key={f.key} className="px-5 py-3">
                    {editingId === item.id ? (
                      renderInput(f, editValues, (k, v) => setEditValues({ ...editValues, [k]: v }), item.id)
                    ) : f.type === 'image' ? (
                      // Always-on uploader: picking a file uploads + auto-saves
                      // the row immediately, no need to enter edit mode.
                      renderInput(
                        f,
                        { [f.key]: item[f.key] },
                        (k, v) => setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, [k]: v } : it))),
                        item.id,
                      )
                    ) : (
                      <span className="text-foreground">
                        {f.type === 'boolean'
                          ? (item[f.key] ? '✓' : '—')
                          : f.format ? formatValue(f.format, item[f.key]) : (item[f.key] ?? '—')}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-5 py-3 text-right">
                  {editingId === item.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => saveEdit(item.id)} disabled={saving}
                        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                      ><Check className="h-3 w-3" /></button>
                      <button onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      ><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      ><Pencil className="h-3 w-3" /> Editar</button>
                      <button onClick={() => deleteItem(item.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
