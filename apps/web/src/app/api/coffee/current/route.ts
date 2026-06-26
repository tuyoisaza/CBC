/**
 * Public(ish) endpoint — the cbc-engine reads this to get the current active coffee.
 * Protected by a shared secret token, not user auth.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-engine-token')
  if (token !== process.env.ENGINE_SECRET_TOKEN) {
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
