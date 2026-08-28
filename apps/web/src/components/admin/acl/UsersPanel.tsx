'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, UserRound } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  name: string | null
  image: string | null
  roleId: string | null
  roleName: string | null
  active: boolean
}

interface RoleOption {
  id: string
  name: string
}

interface UsersPanelProps {
  initialUsers: UserRow[]
  roles: RoleOption[]
}

type FormState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; user: UserRow }

export function UsersPanel({ initialUsers, roles }: UsersPanelProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [active, setActive] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function openCreate() {
    setEmail('')
    setName('')
    setRoleId(roles[0]?.id ?? '')
    setActive(true)
    setError('')
    setForm({ mode: 'create' })
  }

  function openEdit(user: UserRow) {
    setEmail(user.email)
    setName(user.name ?? '')
    setRoleId(user.roleId ?? '')
    setActive(user.active)
    setError('')
    setForm({ mode: 'edit', user })
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      if (form.mode === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: name || undefined, roleId: roleId || undefined, active }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'No se pudo crear el usuario')
        }
        const created = await res.json()
        setUsers((prev) => [
          ...prev,
          {
            id: created.id,
            email: created.email,
            name: created.name,
            image: created.image,
            roleId: created.roleId,
            roleName: created.role?.name ?? null,
            active: created.active,
          },
        ])
        setForm({ mode: 'closed' })
      } else if (form.mode === 'edit') {
        const res = await fetch(`/api/admin/users/${form.user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: name || null,
            roleId: roleId || null,
            active,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? 'No se pudo actualizar el usuario')
        }
        const updated = await res.json()
        setUsers((prev) =>
          prev.map((u) =>
            u.id === updated.id
              ? {
                  id: updated.id,
                  email: updated.email,
                  name: updated.name,
                  image: updated.image,
                  roleId: updated.roleId,
                  roleName: updated.role?.name ?? null,
                  active: updated.active,
                }
              : u,
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

  async function remove(id: string, email: string) {
    if (!confirm(`¿Eliminar al usuario ${email}?`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'No se pudo eliminar el usuario')
      }
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold text-foreground">Usuario</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden sm:table-cell">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Rol</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden md:table-cell">Estado</th>
              <th className="text-right px-5 py-3 font-semibold text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      <img src={u.image} alt={u.name ?? u.email} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                      </div>
                    )}
                    <span className="font-medium text-foreground">{u.name ?? u.email}</span>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.roleName === 'admin'
                      ? 'bg-primary/15 text-primary'
                      : u.roleName
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-muted/50 text-muted-foreground/60'
                  }`}>
                    {u.roleName ?? 'sin rol'}
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className={`text-xs font-medium ${u.active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => remove(u.id, u.email)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  No hay usuarios aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {form.mode !== 'closed' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            {form.mode === 'create' ? 'Nuevo usuario' : `Editar ${form.user.email}`}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Rol</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Sin rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-border"
              />
              Usuario activo
            </label>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={submit}
                disabled={busy || !email}
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
