import { AuditPanel } from '@/components/admin/acl/AuditPanel'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Auditoría — CBC Admin' }

export default function AuditPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro de acciones sensibles realizadas en el panel.
        </p>
      </div>
      <AuditPanel />
    </div>
  )
}
