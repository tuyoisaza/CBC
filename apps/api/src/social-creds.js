/**
 * Social credential resolution for the publishers.
 * Priority: DB (what Lorena authorized in /admin/marketing/connections)
 * → env vars (the legacy deploy path). Cached 5 minutes so every post
 * doesn't round-trip the platform.
 */
const platform = require('./platform');

let cache = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function fromPlatform() {
  const now = Date.now();
  if (cache && now - cachedAt < TTL_MS) return cache;
  try {
    cache = await platform.getSocialCredentials();
    cachedAt = now;
  } catch (err) {
    console.warn('Social creds fetch failed (using env fallback):', err.message);
    cache = cache || { meta: null, linkedin: null };
  }
  return cache;
}

/** { pageId, pageToken, igAccountId } or throws with a clear message. */
async function getMetaCreds() {
  const { meta } = await fromPlatform();
  if (meta?.pageToken && meta?.pageId) {
    return { pageId: meta.pageId, pageToken: meta.pageToken, igAccountId: meta.igAccountId };
  }
  if (process.env.META_ACCESS_TOKEN && process.env.META_FACEBOOK_PAGE_ID) {
    return {
      pageId: process.env.META_FACEBOOK_PAGE_ID,
      pageToken: process.env.META_ACCESS_TOKEN,
      igAccountId: process.env.META_INSTAGRAM_ACCOUNT_ID,
    };
  }
  throw new Error(
    'Instagram/Facebook no conectados. Conéctalos en Admin → Marketing → Conexiones.'
  );
}

/** { accessToken, authorUrn } or throws with a clear message. */
async function getLinkedInCreds() {
  const { linkedin } = await fromPlatform();
  if (linkedin?.accessToken && linkedin?.authorUrn) {
    if (linkedin.expiresAt && new Date(linkedin.expiresAt).getTime() < Date.now()) {
      throw new Error(
        'El token de LinkedIn expiró. Reconecta en Admin → Marketing → Conexiones.'
      );
    }
    return { accessToken: linkedin.accessToken, authorUrn: linkedin.authorUrn };
  }
  if (process.env.LINKEDIN_ACCESS_TOKEN) {
    return {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
      authorUrn: process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_PERSON_URN,
    };
  }
  throw new Error('LinkedIn no conectado. Conéctalo en Admin → Marketing → Conexiones.');
}

/** Drop the cache (e.g. right after a reconnect). */
function invalidate() {
  cache = null;
  cachedAt = 0;
}

module.exports = { getMetaCreds, getLinkedInCreds, invalidate };
