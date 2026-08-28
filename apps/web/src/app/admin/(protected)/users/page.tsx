import { db } from '@/lib/db'
import { UsersPanel } from '@/components/admin/acl/UsersPanel'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Usuarios — CBC Admin' }

async function getData() {
  const [users, roles] = await Promise.all([
    db.user.findMany({
      orderBy: { email: 'asc' },
      include: { role: true },
    }),
    db.role.findMany({ orderBy: { name: 'asc' } }),
  ])
  return {
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      roleId: u.roleId,
      roleName: u.role?.name ?? null,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
    })),
    roles: roles.map((r) => ({ id: r.id, name: r.name })),
  }
}

export default async function UsersPage() {
  const data = await getData()
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra los usuarios del panel y sus roles de acceso.
        </p>
      </div>
      <UsersPanel initialUsers={data.users} roles={data.roles} />
    </div>
  )
}
