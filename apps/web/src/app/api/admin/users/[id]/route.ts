import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { recordAudit } from '@/lib/audit'

const log = createLogger('admin/users')

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().nullable().optional(),
  roleId: z.string().nullable().optional(),
  active: z.boolean().optional(),
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
    const user = await db.user.update({
      where: { id: params.id },
      data: {
        email: data.email?.toLowerCase(),
        name: data.name,
        roleId: data.roleId,
        active: data.active,
      },
      include: { role: true },
    })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      { action: 'update', entity: 'user', entityId: user.id, metadata: { email: user.email } },
    )

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/users/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update user')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const target = await db.user.findUnique({ where: { id: params.id } })
    if (!target) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    await db.user.delete({ where: { id: params.id } })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      { action: 'delete', entity: 'user', entityId: params.id, metadata: { email: target.email } },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ path: '/api/admin/users/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete user')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
