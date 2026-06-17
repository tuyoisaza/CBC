import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '.uploads')

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const filePath = path.join(UPLOAD_DIR, ...params.path)

  if (!filePath.startsWith(UPLOAD_DIR)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mime: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    }
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
