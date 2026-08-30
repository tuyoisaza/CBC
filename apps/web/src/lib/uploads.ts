import fs from 'fs'
import path from 'path'

// Single source of truth for where uploaded images are written and served from.
// Priority:
//   1. UPLOAD_DIR env var (explicit override, any environment)
//   2. /data/uploads when a /data mount exists — Railway mounts the persistent
//      volume there, so files survive redeploys and container restarts
//   3. <cwd>/.uploads — local dev fallback (ephemeral on PaaS)
function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR
  try {
    if (fs.existsSync('/data')) return '/data/uploads'
  } catch {
    /* ignore — fall through to cwd */
  }
  return path.join(process.cwd(), '.uploads')
}

export const UPLOAD_DIR = resolveUploadDir()
