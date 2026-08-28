'use client'

import { useEffect, useState, useCallback } from 'react'
import { ScrollText, RefreshCw } from 'lucide-react'

interface AuditEntry {
  id: string
  actorEmail: string | null
  action: string
  entity: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { email: string; name: string | null } | null
}

const ENTITIES = [
  { key: 'user', label: 'Usuarios' },
  { key: 'role', label: 'Roles' },
  { key: 'settings', label: 'Config' },
  { key: 'product', label: 'Productos' },
  { key: 'quote', label: 'Cotizaciones' },
  { key: 'order', label: 'Pedidos' },
]

const ACTIONS = [
  { key: 'create', label: 'Crear' },
  { key: 'update', label: 'Editar' },
  { key: 'delete', label: 'Eliminar' },
  { key: 'login', label: 'Acceso' },
]

export function AuditPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (entity) params.set('entity', entity)
      if (action) params.set('action', action)
      params.set('limit', '50')
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'No se pudo cargar la auditoría')
      }
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [entity, action])

  useEffect(() => {
    load()
  }, [load])

  function badgeClass(actionName: string): string {
    switch (actionName) {
      case 'create': return 'bg-green-500/15 text-green-600 dark:text-green-400'
      case 'update': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
      case 'delete': return 'bg-red-500/15 text-red-600 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Todas las entidades</option>
          {ENTITIES.map((e) => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refrescar
        </button>
        <span className="ml-auto text-sm text-muted-foreground">{total} registro{total !== 1 ? 's' : ''}</span>
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
              <th className="text-left px-5 py-3 font-semibold text-foreground">Fecha</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden sm:table-cell">Usuario</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground">Acción</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden md:table-cell">Entidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground">
                  {l.user?.email ?? l.actorEmail ?? 'sistema'}
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(l.action)}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{l.entity}</span>
                    {l.entityId && (
                      <code className="text-xs text-muted-foreground">{l.entityId.slice(0, 8)}</code>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No hay registros de auditoría
                </td>
              </tr>
            )}
            {logs.length === 0 && loading && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
