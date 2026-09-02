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

/**
 * Block until Postgres answers a trivial query, or give up after `maxWaitMs`.
 *
 * The DB runs in serverless mode: it stops after idle and cold-starts on the
 * next connection, which can take 10–30 s (container schedule + WAL recovery).
 * `withDbRetry`'s ~2 s budget isn't enough for that. Call this once at the top
 * of a request that must not fail on a sleeping DB (checkout) — it pings every
 * `intervalMs` until `SELECT 1` succeeds, then the rest of the handler runs
 * against a warm connection.
 */
export async function ensureDbAwake(
  opts: { maxWaitMs?: number; intervalMs?: number } = {},
): Promise<{ waitedMs: number; wokeUp: boolean }> {
  const maxWaitMs = opts.maxWaitMs ?? 35_000
  const intervalMs = opts.intervalMs ?? 1_500
  const start = Date.now()
  let attempt = 0

  for (;;) {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { waitedMs: Date.now() - start, wokeUp: attempt > 0 }
    } catch (err) {
      attempt++
      if (Date.now() - start + intervalMs >= maxWaitMs) throw err
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
}
