import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { recordAudit } from '@/lib/audit'

const log = createLogger('admin/roles')

export const dynamic = 'force-dynamic'

export const ALL_PERMISSIONS = [
  'dashboard:read',
  'sales:read',
  'sales:write',
  'service:read',
  'service:write',
  'users:read',
  'users:write',
  'roles:read',
  'roles:write',
  'audit:read',
  'settings:read',
  'settings:write',
  'debug:read',
  'system:read',
] as const

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
})

const updateSchema = createSchema.partial()

function requireAdmin(session: { user: { role?: string } } | null) {
  if (!session) return { error: 'Unauthorized' as const, status: 401 as const }
  if (session.user.role?.toLowerCase() !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const roles = await db.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    })
    return NextResponse.json(roles)
  } catch (error) {
    log.error({ path: '/api/admin/roles', method: 'GET', error }, 'Failed to fetch roles')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const role = await db.role.create({
      data: { name: data.name, description: data.description, permissions: data.permissions },
    })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      { action: 'create', entity: 'role', entityId: role.id, metadata: { name: role.name } },
    )

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/roles', method: 'POST', error }, 'Failed to create role')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
