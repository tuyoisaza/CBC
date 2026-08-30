import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { uploadBuffer } from '@/lib/r2'
import { UPLOAD_DIR } from '@/lib/uploads'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/upload')

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024

// R2 gives durable, absolute URLs that survive container restarts and render
// in emails. Local disk is a dev-only fallback — on most PaaS containers
// (Railway included) it is wiped on every redeploy/restart, so uploads there
// "disappear" after a save.
const R2_READY = Boolean(
  process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_SECRET_KEY &&
  process.env.CLOUDFLARE_R2_BUCKET &&
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
)

export async function POST(req: NextRequest) {
  const url      = new URL(req.url)
  const filename = url.searchParams.get('filename') || 'image.png'
  const type     = url.searchParams.get('type') || req.headers.get('content-type') || 'image/png'
  const folder   = (url.searchParams.get('folder') || 'general').replace(/[^a-zA-Z0-9._-]/g, '_')

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await req.arrayBuffer())
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    if (R2_READY) {
      const publicUrl = await uploadBuffer(`uploads/${folder}/${safeName}`, buffer, type)
      log.info({ path: '/api/upload', method: 'POST', folder, filename: safeName, store: 'r2' }, 'File uploaded to R2')
      return NextResponse.json({ uploadUrl: publicUrl, publicUrl })
    }

    const dir = path.join(UPLOAD_DIR, folder)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, safeName), buffer)
    const publicUrl = `/api/uploads/${folder}/${safeName}`
    const durable = UPLOAD_DIR.startsWith('/data') || Boolean(process.env.UPLOAD_DIR)
    log.info(
      { path: '/api/upload', method: 'POST', folder, filename: safeName, store: 'disk', dir: UPLOAD_DIR, durable },
      durable
        ? 'File saved to disk'
        : 'File saved to ephemeral disk — mount a volume (UPLOAD_DIR / /data) or set CLOUDFLARE_R2_* for durable storage',
    )
    return NextResponse.json({ uploadUrl: publicUrl, publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ path: '/api/upload', method: 'POST', error: msg }, 'Upload failed')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
