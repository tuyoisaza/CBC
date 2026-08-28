'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'

const ALL_PERMISSIONS = [
  { key: 'dashboard:read', label: 'Dashboard' },
  { key: 'sales:read', label: 'Ventas (leer)' },
  { key: 'sales:write', label: 'Ventas (escribir)' },
  { key: 'service:read', label: 'Servicio (leer)' },
  { key: 'service:write', label: 'Servicio (escribir)' },
  { key: 'users:read', label: 'Usuarios (leer)' },
  { key: 'users:write', label: 'Usuarios (escribir)' },
  { key: 'roles:read', label: 'Roles (leer)' },
  { key: 'roles:write', label: 'Roles (escribir)' },
  { key: 'audit:read', label: 'Auditoría (leer)' },
  { key: 'ai:read', label: 'Asistente IA' },
  { key: 'settings:read', label: 'Config (leer)' },
  { key: 'settings:write', label: 'Config (escribir)' },
  { key: 'debug:read', label: 'Debug' },
  { key: 'system:read', label: 'Sistema' },
] as const

interface RoleRow {
  id: string
  name: string
  description: string | null
  permissions: string[]
  userCount: number
}

interface RolesPanelProps {
  initialRoles: RoleRow[]
}

type FormState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; role: RoleRow }

export function RolesPanel({ initialRoles }: RolesPanelProps) {
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function togglePermission(key: string) {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    )
  }

  function openCreate() {
    setName('')
    setDescription('')
    setPermissions([])
    setError('')
    setForm({ mode: 'create' })
  }

  function openEdit(role: RoleRow) {
    setName(role.name)
    setDescription(role.description ?? '')
    setPermissions(role.permissions)
    setError('')
    setForm({ mode: 'edit', role })
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      if (form.mode === 'create') {
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: description || undefined, permissions }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'No se pudo crear el rol')
        }
        const created = await res.json()
        setRoles((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            description: created.description,
            permissions: created.permissions,
            userCount: 0,
          },
        ])
        setForm({ mode: 'closed' })
      } else if (form.mode === 'edit') {
        const res = await fetch(`/api/admin/roles/${form.role.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: description || null, permissions }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'No se pudo actualizar el rol')
        }
        const updated = await res.json()
        setRoles((prev) =>
          prev.map((r) =>
            r.id === updated.id
              ? {
                  id: updated.id,
                  name: updated.name,
                  description: updated.description,
                  permissions: updated.permissions,
                  userCount: r.userCount,
                }
              : r,
          ),
        )
        setForm({ mode: 'closed' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string, roleName: string) {
    if (!confirm(`¿Eliminar el rol ${roleName}?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'No se pudo eliminar el rol')
      }
      setRoles((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roles.length} rol{roles.length !== 1 ? 'es' : ''}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo rol
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{r.name}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {r.permissions.length} permisos
                    </span>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.userCount} usuario{r.userCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => remove(r.id, r.name)}
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {r.permissions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.permissions.map((p) => (
                  <span key={p} className="rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5 font-mono">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No hay roles aún
          </div>
        )}
      </div>

      {form.mode !== 'closed' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {form.mode === 'create' ? 'Nuevo rol' : `Editar rol ${form.role.name}`}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Permisos</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={permissions.includes(p.key)}
                      onChange={() => togglePermission(p.key)}
                      className="rounded border-border"
                    />
                    <span>{p.label}</span>
                    <code className="ml-auto text-xs text-muted-foreground">{p.key}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={submit}
                disabled={busy || !name}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setForm({ mode: 'closed' })}
                disabled={busy}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
