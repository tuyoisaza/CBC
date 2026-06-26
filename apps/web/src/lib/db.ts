import { prisma } from '@cbc/db'

export const db = prisma

/**
 * Run a DB query with retries on transient connection failures.
 *
 * Right after a cold start (a freshly deployed container, or Postgres
 * waking from idle) the very first query can race the Prisma connection
 * and throw. Without this, callers that fall back to empty data render a
 * page with missing content on the first visit, which then "fixes itself"
 * on reload once the connection is warm. Retrying with a short backoff
 * absorbs that race so the first render is correct.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 400,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastErr
}
