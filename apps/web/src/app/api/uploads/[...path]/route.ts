import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { UPLOAD_DIR } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  // Resolve inside UPLOAD_DIR and reject anything that escapes it.
  const filePath = path.resolve(UPLOAD_DIR, ...params.path)
  const root = path.resolve(UPLOAD_DIR)
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
