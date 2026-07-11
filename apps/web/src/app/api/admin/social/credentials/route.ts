/**
 * Full social credentials for the engine (tokens included) — engine token
 * only, never session. The engine caches these and falls back to its env
 * vars when a network isn't connected here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { isEngineRequest } from '@/lib/engine-auth'
import { getMetaCreds, getLinkedInCreds } from '@/lib/social'

export async function GET(req: NextRequest) {
  if (!isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [meta, linkedin] = await Promise.all([getMetaCreds(), getLinkedInCreds()])
  return NextResponse.json({ meta, linkedin })
}
