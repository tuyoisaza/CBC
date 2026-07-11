'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, X, Check, Trash2 } from 'lucide-react'

export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean'
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
}: {
  title: string
  description: string
  apiPath: string
  fields: Field[]
  emptyMessage: string
}) {
  const [items, setItems] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [newValues, setNewValues] = useState<Record<string, any>>({})
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    const body: Record<string, any> = {}
    for (const f of fields) {
      if (editValues[f.key] !== undefined) body[f.key] = editValues[f.key]
    }
    try {
      await fetch(`${apiPath}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setEditingId(null)
      load()
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
    try {
      await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newValues),
      })
      setShowNew(false)
      setNewValues({})
      load()
    } finally {
      setSaving(false)
    }
  }

  function renderInput(field: Field, values: Record<string, any>, onChange: (key: string, val: any) => void) {
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
                      renderInput(f, editValues, (k, v) => setEditValues({ ...editValues, [k]: v }))
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
