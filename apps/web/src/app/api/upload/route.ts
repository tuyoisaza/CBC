import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl, logoKey, productImageKey } from '@/lib/r2'
import { z } from 'zod'
import crypto from 'crypto'

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function GET(req: NextRequest) {
  const url      = new URL(req.url)
  const filename = url.searchParams.get('filename') || 'logo.png'
  const type     = url.searchParams.get('type') || 'image/png'
  const folder   = url.searchParams.get('folder') || 'logo'

  console.log(`[upload] GET filename=${filename} type=${type} folder=${folder}`)

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  try {
    const id  = crypto.randomUUID()
    const key = folder === 'product' ? productImageKey(id, filename) : logoKey(id, filename)
    console.log(`[upload] key=${key}`)

    const { uploadUrl, publicUrl } = await getUploadUrl(key, type)
    console.log(`[upload] ok publicUrl=${publicUrl}`)

    return NextResponse.json({ uploadUrl, publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[upload] error ${msg}`)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
