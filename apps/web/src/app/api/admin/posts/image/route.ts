/**
 * Engine → R2 image bridge. The engine posts the generated image bytes here;
 * we store them in R2 and return a durable public URL for Post.imageUrl.
 * (DALL-E URLs expire and engine-local tmp files die on redeploy — history
 * thumbnails need a real home. R2 creds stay on the platform only.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { uploadBuffer } from '@/lib/r2'
import { isEngineRequest } from '@/lib/engine-auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/admin/posts/image')

const MAX_SIZE = 15 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (!isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const filename = (url.searchParams.get('filename') || 'post.jpg').replace(/[^a-zA-Z0-9._-]/g, '_')
    const contentType = req.headers.get('content-type') || 'image/jpeg'

    const buffer = Buffer.from(await req.arrayBuffer())
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
    }

    const key = `posts/${Date.now()}-${filename}`
    const publicUrl = await uploadBuffer(key, buffer, contentType)

    log.info({ key, bytes: buffer.byteLength }, 'Post image stored in R2')
    return NextResponse.json({ publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ error: msg }, 'Post image upload failed')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
