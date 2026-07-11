import { db } from '@/lib/db'

/**
 * Social account credentials, stored in the Setting table after Lorena
 * connects each network from /admin/marketing/connections. The engine reads
 * them via /api/admin/social/credentials; env vars remain a fallback so the
 * old deploy path keeps working.
 */

export interface MetaCreds {
  pageId: string
  pageName: string
  pageToken: string // long-lived page access token (does not expire)
  igAccountId?: string
  igUsername?: string
  connectedAt: string
}

export interface LinkedInCreds {
  accessToken: string
  authorUrn: string // urn:li:person:xxx
  name?: string
  connectedAt: string
  expiresAt?: string // LinkedIn tokens last ~60 days
}

const KEYS = {
  meta: 'social.meta',
  linkedin: 'social.linkedin',
} as const

export type SocialNetwork = keyof typeof KEYS

async function getJson<T>(key: string): Promise<T | null> {
  const row = await db.setting.findUnique({ where: { key } })
  if (!row) return null
  try {
    return JSON.parse(row.value) as T
  } catch {
    return null
  }
}

async function setJson(key: string, value: unknown) {
  await db.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value), encrypted: false },
    create: { key, value: JSON.stringify(value), encrypted: false },
  })
}

export const getMetaCreds = () => getJson<MetaCreds>(KEYS.meta)
export const setMetaCreds = (c: MetaCreds) => setJson(KEYS.meta, c)
export const getLinkedInCreds = () => getJson<LinkedInCreds>(KEYS.linkedin)
export const setLinkedInCreds = (c: LinkedInCreds) => setJson(KEYS.linkedin, c)

export async function disconnect(network: SocialNetwork) {
  await db.setting.deleteMany({ where: { key: KEYS[network] } })
}

/** Connection status for the admin UI — never exposes tokens. */
export async function getConnectionStatus() {
  const [meta, linkedin] = await Promise.all([getMetaCreds(), getLinkedInCreds()])
  return {
    meta: meta
      ? {
          connected: true as const,
          pageName: meta.pageName,
          igUsername: meta.igUsername || null,
          connectedAt: meta.connectedAt,
        }
      : { connected: false as const },
    linkedin: linkedin
      ? {
          connected: true as const,
          name: linkedin.name || null,
          connectedAt: linkedin.connectedAt,
          expiresAt: linkedin.expiresAt || null,
        }
      : { connected: false as const },
    // App-level OAuth credentials present? (needed to even start the flows)
    appsConfigured: {
      meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
      linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    },
  }
}
