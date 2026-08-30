import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { UPLOAD_DIR, uploadPath, uploadUrl } from '@/lib/uploads'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/upload')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024

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

    // Single storage location — the persistent volume at /data/uploads.
    const dir = uploadPath(folder)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, safeName), buffer)

    const publicUrl = uploadUrl(folder, safeName)
    log.info(
      { path: '/api/upload', method: 'POST', folder, filename: safeName, dir: UPLOAD_DIR },
      'File saved',
    )
    return NextResponse.json({ uploadUrl: publicUrl, publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ path: '/api/upload', method: 'POST', error: msg, dir: UPLOAD_DIR }, 'Upload failed')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
