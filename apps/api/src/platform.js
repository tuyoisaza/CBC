/**
 * Platform client — the engine's only door to the CBC platform.
 * All state (coffee, posts, schedule) lives in the platform's Postgres;
 * the engine reads/writes it over HTTP with the shared engine token.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.PLATFORM_URL || 'http://localhost:3000').replace(/\/$/, '');

function client() {
  return axios.create({
    baseURL: BASE,
    timeout: 30000,
    headers: { 'x-engine-token': process.env.ENGINE_SECRET_TOKEN || '' },
  });
}

/** Retry transient failures with exponential backoff. */
async function withRetry(fn, { retries = 2, delayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Don't retry 4xx — those are contract errors, not transient
      const status = err.response?.status;
      if (status && status >= 400 && status < 500) throw err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

/** Active Coffee row from the DB (single source of truth). */
async function getCurrentCoffee() {
  const res = await withRetry(() => client().get('/api/coffee/current'));
  return res.data;
}

/**
 * Persist a Post row.
 * post: { platform, contentType, caption, imageUrl?, imagePrompt?,
 *         status: 'published'|'failed'|'scheduled', platformPostId?, errorMsg?, coffeeId? }
 */
async function savePost(post) {
  const res = await withRetry(() => client().post('/api/admin/posts', post));
  return res.data;
}

/** Query recent Post rows. params: { type?, platform?, status?, limit? } */
async function findPosts(params = {}) {
  const res = await withRetry(() => client().get('/api/admin/posts', { params }));
  return res.data;
}

/** Update a Post row (approval flow: scheduled → published / draft). */
async function updatePost(id, data) {
  const res = await withRetry(() => client().patch(`/api/admin/posts/${id}`, data));
  return res.data;
}

/** Create + activate a Coffee row (WhatsApp coffee updates land here). */
async function upsertCoffee(coffee) {
  const res = await withRetry(() => client().post('/api/admin/coffee', coffee));
  return res.data;
}

/** Merged schedule (defaults + Setting.schedule.* overrides). */
async function getSchedule() {
  const res = await withRetry(() => client().get('/api/admin/schedule'));
  return res.data;
}

/** Social credentials Lorena authorized from /admin/marketing/connections. */
async function getSocialCredentials() {
  const res = await withRetry(() => client().get('/api/admin/social/credentials'));
  return res.data; // { meta: {...}|null, linkedin: {...}|null }
}

/** Upload a generated post image to R2 via the platform. Returns durable public URL. */
async function uploadPostImage(filepath) {
  const buffer = fs.readFileSync(filepath);
  const filename = path.basename(filepath);
  const res = await withRetry(() =>
    client().post(`/api/admin/posts/image?filename=${encodeURIComponent(filename)}`, buffer, {
      headers: { 'Content-Type': 'image/jpeg' },
      maxBodyLength: 20 * 1024 * 1024,
    })
  );
  return res.data.publicUrl;
}

module.exports = {
  getCurrentCoffee,
  savePost,
  findPosts,
  updatePost,
  upsertCoffee,
  getSchedule,
  getSocialCredentials,
  uploadPostImage,
  withRetry,
};
