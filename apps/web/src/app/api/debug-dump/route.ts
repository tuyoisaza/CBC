import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('debug-dump')

const MAX_PAYLOAD = 100 * 1024 // 100KB
const RATE_WINDOW = 30_000 // 30 seconds

const ipTimestamps = new Map<string, number>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const last = ipTimestamps.get(ip)
  const now = Date.now()
  if (last && (now - last) < RATE_WINDOW) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }
  ipTimestamps.set(ip, now)

  try {
    const body = await req.json()
    const raw = JSON.stringify(body)
    if (raw.length > MAX_PAYLOAD) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    log.info({ ip, entryCount: body.entries?.length, url: body.url }, 'Client debug report')

    // Log each entry individually for searchability
    for (const entry of (body.entries || [])) {
      const args = (entry.args || []).join(' ')
      console.error(`[debug-dump] [${entry.type}] ${entry.timestamp} ${args}`)
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), requestId: crypto.randomUUID?.() || ts() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ error: msg }, 'Failed to process debug dump')
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

function ts() {
  return Date.now().toString(36)
}
