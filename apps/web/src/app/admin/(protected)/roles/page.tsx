import { db } from '@/lib/db'
import { RolesPanel } from '@/components/admin/acl/RolesPanel'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Roles — CBC Admin' }

async function getData() {
  const roles = await db.role.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  })
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions as string[],
    userCount: r._count.users,
  }))
}

export default async function RolesPage() {
  const roles = await getData()
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define los roles de acceso y sus permisos en el panel.
        </p>
      </div>
      <RolesPanel initialRoles={roles} />
    </div>
  )
}
