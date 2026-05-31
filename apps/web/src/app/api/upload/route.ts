import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl, logoKey } from '@/lib/r2'
import { z } from 'zod'
import crypto from 'crypto'

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function GET(req: NextRequest) {
  const url      = new URL(req.url)
  const filename = url.searchParams.get('filename') || 'logo.png'
  const type     = url.searchParams.get('type') || 'image/png'

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const id  = crypto.randomUUID()
  const key = logoKey(id, filename)
  const { uploadUrl, publicUrl } = await getUploadUrl(key, type)

  return NextResponse.json({ uploadUrl, publicUrl })
}
