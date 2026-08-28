import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { recordAudit } from '@/lib/audit'

const log = createLogger('admin/roles')

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  permissions: z.array(z.string()).optional(),
})

function requireAdmin(session: { user: { role?: string } } | null) {
  if (!session) return { error: 'Unauthorized' as const, status: 401 as const }
  if (session.user.role?.toLowerCase() !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const role = await db.role.update({
      where: { id: params.id },
      data: { name: data.name, description: data.description, permissions: data.permissions },
    })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      { action: 'update', entity: 'role', entityId: role.id, metadata: { name: role.name } },
    )

    return NextResponse.json(role)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/roles/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update role')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const target = await db.role.findUnique({ where: { id: params.id } })
    if (!target) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const users = await db.user.count({ where: { roleId: params.id } })
    if (users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a role that is assigned to users' },
        { status: 409 },
      )
    }

    await db.role.delete({ where: { id: params.id } })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      { action: 'delete', entity: 'role', entityId: params.id, metadata: { name: target.name } },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ path: '/api/admin/roles/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete role')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
