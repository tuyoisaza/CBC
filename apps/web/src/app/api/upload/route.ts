import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

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

    const dir = path.join(UPLOAD_DIR, folder)
    await fs.mkdir(dir, { recursive: true })

    const stamp = Date.now()
    const safeName = `${stamp}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(dir, safeName)
    await fs.writeFile(filePath, Buffer.from(buffer))

    const publicUrl = `/uploads/${folder}/${safeName}`
    console.log(`[upload] saved ${filePath} -> ${publicUrl}`)

    return NextResponse.json({ uploadUrl: publicUrl, publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[upload] error ${msg}`)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
