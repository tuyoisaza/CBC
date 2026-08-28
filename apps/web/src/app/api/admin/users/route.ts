import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { recordAudit } from '@/lib/audit'

const log = createLogger('admin/users')

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  roleId: z.string().optional(),
  active: z.boolean().optional(),
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
    const users = await db.user.findMany({
      orderBy: { email: 'asc' },
      include: { role: true },
    })
    return NextResponse.json(users)
  } catch (error) {
    log.error({ path: '/api/admin/users', method: 'GET', error }, 'Failed to fetch users')
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
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        roleId: data.roleId,
        active: data.active ?? true,
      },
      include: { role: true },
    })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      { action: 'create', entity: 'user', entityId: user.id, metadata: { email: user.email } },
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/users', method: 'POST', error }, 'Failed to create user')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
