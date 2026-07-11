import { timingSafeEqual } from 'crypto'

/**
 * Does this request carry a valid engine token?
 * Timing-safe compare — a plain === leaks length/prefix info via timing.
 */
export function isEngineRequest(req: { headers: { get(name: string): string | null } }): boolean {
  const token = req.headers.get('x-engine-token')
  const secret = process.env.ENGINE_SECRET_TOKEN
  if (!token || !secret) return false
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
