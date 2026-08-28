import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('admin/audit')

export const dynamic = 'force-dynamic'

function requireAdmin(session: { user: { role?: string } } | null) {
  if (!session) return { error: 'Unauthorized' as const, status: 401 as const }
  if (session.user.role?.toLowerCase() !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity')
    const action = searchParams.get('action')
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 200)

    const where: { entity?: string; action?: string } = {}
    if (entity) where.entity = entity
    if (action) where.action = action

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { email: true, name: true } } },
    })

    const total = await db.auditLog.count({ where })

    return NextResponse.json({ logs, total })
  } catch (error) {
    log.error({ path: '/api/admin/audit', method: 'GET', error }, 'Failed to fetch audit logs')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
