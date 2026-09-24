import { getServerSession, type Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export class SuperadminAccessError extends Error {
  constructor(public readonly status: 401 | 403 | 503, message = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Access verification unavailable') {
    super(message)
    this.name = 'SuperadminAccessError'
  }
}

/** Session flags and role names are never sufficient for elevated access. */
export async function getFreshAccessUser(session: Session | null) {
  if (!session?.user?.id || !session.user.email) throw new SuperadminAccessError(401)
  let user
  try {
    user = await db.user.findUnique({ where: { id: session.user.id }, include: { role: true } })
  } catch { throw new SuperadminAccessError(503) }
  if (!user?.active || user.email.toLowerCase() !== session.user.email.toLowerCase()) throw new SuperadminAccessError(403)
  return user
}

export async function isSuperadminSession(session: Session | null): Promise<boolean> {
  try { return (await getFreshAccessUser(session)).isSuperadmin === true }
  catch (error) {
    if (error instanceof SuperadminAccessError && error.status !== 503) return false
    throw error
  }
}

export async function requireSuperadmin(): Promise<{ id: string; email: string }> {
  let session
  try { session = await getServerSession(authOptions) }
  catch { throw new SuperadminAccessError(503) }
  const user = await getFreshAccessUser(session)
  if (!user.isSuperadmin) throw new SuperadminAccessError(403)
  return { id: user.id, email: user.email }
}

export async function requireAdminAccess(session: Session | null) {
  try {
    const user = await getFreshAccessUser(session)
    if (!user.isSuperadmin && user.role?.name.toLowerCase() !== 'admin') return { error: 'Forbidden', status: 403 }
    return null
  } catch (error) {
    if (error instanceof SuperadminAccessError) return { error: error.message, status: error.status }
    return { error: 'Access verification unavailable', status: 503 }
  }
}
