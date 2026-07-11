/**
 * Public(ish) endpoint — the cbc-engine reads this to get the current active coffee.
 * Protected by the shared engine token (timing-safe compare), not user auth.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { isEngineRequest } from '@/lib/engine-auth'

export async function GET(req: NextRequest) {
  if (!isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const coffee = await withDbRetry(() =>
    db.coffee.findFirst({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
    }),
  )

  if (!coffee) {
    return NextResponse.json({ error: 'No active coffee' }, { status: 404 })
  }

  return NextResponse.json(coffee)
}
