/**
 * Engine HTTP server — honors the contract defined by the platform's
 * apps/web/src/lib/engine.ts:
 *
 *   GET  /health            → { status, currentCoffee, lastUpdated, nextPosts }
 *   POST /trigger/:type     → generate + publish one post now
 *   POST /preview           → generate caption+image, publish nothing
 *   POST /config/schedule   → re-register cron live
 *   POST /config/coffee     → no-op ack (DB is the source of truth)
 *   GET/POST /webhooks/whatsapp → Meta verify + inbound (signature-checked)
 *
 * All control routes require the shared x-engine-token (timing-safe compare).
 * The WhatsApp webhook authenticates via X-Hub-Signature-256 instead.
 */
const express = require('express');
const crypto = require('crypto');

const scheduler = require('./scheduler');
const platform = require('./platform');
const { verifyWebhook, handleWebhook } = require('./webhooks/whatsapp');
const postRunner = require('./post-runner');

const productPost = require('./content-types/product-post');
const coffeeStory = require('./content-types/coffee-story');
const linkedinPost = require('./content-types/linkedin-post');
const socialProof = require('./content-types/social-proof');
const seasonal = require('./content-types/seasonal');

const CONTENT_TYPES = {
  'product-post': productPost,
  'coffee-story': coffeeStory,
  'linkedin-post': linkedinPost,
  'social-proof': socialProof,
  seasonal,
};

const app = express();

// Capture the raw body — required for X-Hub-Signature-256 verification
// (parsed JSON can't be re-serialized byte-identically)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─── WhatsApp webhook (Meta-authenticated, not token-authenticated) ─────────
app.get('/webhooks/whatsapp', verifyWebhook);
app.post('/webhooks/whatsapp', handleWebhook);

// ─── Engine token guard for everything else ──────────────────────────────────
function tokenMatches(header) {
  const secret = process.env.ENGINE_SECRET_TOKEN;
  if (!header || !secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.use((req, res, next) => {
  if (!tokenMatches(req.headers['x-engine-token'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// ─── Control routes ───────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let currentCoffee = '—';
  let lastUpdated = '—';
  try {
    const coffee = await platform.getCurrentCoffee();
    currentCoffee = coffee.name;
    lastUpdated = coffee.updatedAt || '—';
  } catch {
    // platform unreachable or no active coffee — health still reports running
  }
  res.json({
    status: 'running',
    currentCoffee,
    lastUpdated,
    nextPosts: scheduler.nextPosts(),
  });
});

app.post('/trigger/:type', async (req, res) => {
  const mod = CONTENT_TYPES[req.params.type];
  if (!mod) return res.status(400).json({ error: `Unknown type: ${req.params.type}` });
  try {
    const result = await mod.run(req.body?.platforms);
    res.json(result);
  } catch (e) {
    console.error(`Trigger ${req.params.type} failed:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/preview', async (req, res) => {
  const mod = CONTENT_TYPES[req.body?.type];
  if (!mod) return res.status(400).json({ error: `Unknown type: ${req.body?.type}` });
  try {
    res.json(await mod.preview());
  } catch (e) {
    console.error(`Preview ${req.body?.type} failed:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/config/schedule', (req, res) => {
  try {
    scheduler.reschedule(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Coffee lives in the platform DB — this is a warm-cache ack for the admin's
// non-fatal sync call, kept for contract compatibility.
app.post('/config/coffee', (_req, res) => res.json({ ok: true }));

// Manual approval resolution (admin UI could call these too)
app.post('/approve', async (_req, res) => {
  try {
    res.json({ summary: await postRunner.publishScheduled() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/discard', async (_req, res) => {
  try {
    res.json({ summary: await postRunner.discardScheduled() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = app;
