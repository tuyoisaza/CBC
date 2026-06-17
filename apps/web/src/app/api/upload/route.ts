import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { createLogger } from '@/lib/logger'
import { uploadBuffer } from '@/lib/r2'
const log = createLogger('api/upload')

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function POST(req: NextRequest) {
  const url      = new URL(req.url)
  const filename = url.searchParams.get('filename') || 'image.png'
  const type     = url.searchParams.get('type') || req.headers.get('content-type') || 'image/png'
  const folder   = url.searchParams.get('folder') || 'general'

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  try {
    const buffer = await req.arrayBuffer()
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    if (process.env.CLOUDFLARE_R2_BUCKET) {
      const publicUrl = await uploadBuffer(`uploads/${folder}/${safeName}`, Buffer.from(buffer), type)
      log.info({ path: '/api/upload', method: 'POST', folder, key: safeName, publicUrl }, 'File saved to R2')
      return NextResponse.json({ uploadUrl: publicUrl, publicUrl })
    }

    const dir = path.join(UPLOAD_DIR, folder)
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, safeName)
    await fs.writeFile(filePath, Buffer.from(buffer))

    const publicUrl = `/uploads/${folder}/${safeName}`
    log.info({ path: '/api/upload', method: 'POST', folder, filename: safeName }, 'File saved locally')

    return NextResponse.json({ uploadUrl: publicUrl, publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ path: '/api/upload', method: 'POST', error: msg }, 'Upload failed')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
