import path from 'path'

// The one and only location where uploaded files are written AND served from.
// Production (Railway) mounts a persistent volume at /data, so every upload
// lives under /data/uploads and survives redeploys and restarts.
//
// UPLOAD_DIR exists solely as a local-dev / CI escape hatch (a dev machine
// cannot write to /data). It must never be set in production.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads'

// Absolute path on disk for a given "<folder>/<file>" upload key.
export function uploadPath(...segments: string[]): string {
  return path.join(UPLOAD_DIR, ...segments)
}

// Public URL the browser/email uses to fetch an upload back.
export function uploadUrl(folder: string, filename: string): string {
  return `/api/uploads/${folder}/${filename}`
}
