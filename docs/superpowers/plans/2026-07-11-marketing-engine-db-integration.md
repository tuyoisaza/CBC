# Marketing Engine — DB Integration & Ideal State — Implementation Plan

> **STATUS (2026-07-11): Implemented through M4.** ✅ M1 (Tasks 1–5: engine HTTP
> server + platform client, DB coffee, Post writeback w/ idempotency+retry,
> DB schedule + live reschedule, signed webhook → DB) · ✅ M2 (Task 10 auto-ack
> + Message stamp; Task 9 cadence + Task 12 Q3 season shipped as new defaults)
> · ✅ M3 (Tasks 6–7: R2 post images via `/api/admin/posts/image`, WhatsApp
> failure alerts) · ✅ M4 (Task 8: approval loop `scheduled→published` over
> WhatsApp + deterministic brand guard; Task 13 `social-proof` generator).
> Verified: web typecheck + prod build green; engine smoke tests (token auth,
> health, live reschedule, X-Hub-Signature-256 accept/reject, guard rules) pass.
> **Remaining:** M5 (Task 11 nurture, Task 14 referral ask) · M6 (engagement
> pull-back, Task 15 dashboard) · deploy-time steps (env vars incl.
> `WHATSAPP_APP_SECRET`, repoint Meta webhook to the engine, single replica).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) for syntax tracking.

**Goal:** Wire the standalone content engine (`apps/api`) to the platform DB it was always meant to use — so "current coffee" has one source of truth, every published post is recorded and visible in admin, the schedule is DB-driven, and (phase 3) public posts get a one-tap WhatsApp approval before going live.

**Key finding:** The **platform side already implements the full contract.** [`apps/web/src/lib/engine.ts`](../../../apps/web/src/lib/engine.ts) documents it: _"The engine reads current coffee from this platform's `/api/coffee/current` endpoint. Posts are saved back to the platform's DB via `/api/admin/posts`."_ These endpoints exist and are token-protected. The admin marketing module (`coffee`, `generator`, `schedule`, `history`) already reads `db.coffee` / `db.post` / `Setting.schedule.*`. **The engine is the only half never built to match** — it has no HTTP server (so `lib/engine.ts` calls all fail and health shows "offline"), reads `config/coffee.json` instead of the DB, never writes `Post` rows, and its WhatsApp webhook is unmounted dead code.

**Architecture:** Give the engine an Express HTTP layer honoring the existing contract (`/health`, `/trigger/:type`, `/preview`, `/config/coffee`, `/config/schedule`, `/webhooks/whatsapp`). Replace all file-state reads with platform HTTP calls (coffee from `/api/coffee/current`, posts to `/api/admin/posts`, schedule from `Setting`). Persist post images to R2 so history thumbnails survive. Add a `scheduled`→`published` approval loop over WhatsApp for LinkedIn/seasonal. No new Prisma models — the schema (`Coffee`, `Post` with `status`/`platformPostId`/`errorMsg`, `Setting`) already supports all of this.

**Tech Stack:** Node.js (CommonJS) engine with `express` + `node-cron`; Next.js 14 platform; Prisma/PostgreSQL; Cloudflare R2; Meta/LinkedIn Graph APIs; Anthropic + OpenAI SDKs. Engine↔platform auth via shared `ENGINE_SECRET_TOKEN` (`x-engine-token` header).

---

## The contract (already defined by the platform)

| Engine exposes (called by `lib/engine.ts`) | Purpose |
|---|---|
| `GET /health` | `{ status, currentCoffee, lastUpdated, nextPosts[] }` — drives admin "Motor: Activo/Offline" |
| `POST /trigger/:type` | Generate + publish one post now; returns platform post IDs |
| `POST /preview` | Generate caption+image without publishing |
| `POST /config/coffee` | Receive active-coffee push (warm cache; DB is source of truth) |
| `POST /config/schedule` | Receive schedule change → re-register cron live |
| `GET /webhooks/whatsapp` · `POST /webhooks/whatsapp` | Meta verify + inbound (Lorena's coffee updates / approvals) |

| Platform exposes (called by the engine) | Purpose |
|---|---|
| `GET /api/coffee/current` (engine token) | Active `Coffee` row — replaces `coffee.json` reads |
| `POST /api/admin/posts` (engine token) | Persist a `Post` after publish/failure — the missing writeback |
| `POST /api/admin/coffee` (needs engine-token path — Task 5) | Upsert active coffee from WhatsApp |
| `GET /api/admin/schedule` (needs engine-token path — Task 4) | Load schedule on boot |
| `POST /api/upload` (needs engine-token path — Task 6) | Store post image in R2, get durable URL |

---

## File Map

### Engine (`apps/api`)
| File | Action |
|------|--------|
| `apps/api/package.json` | Add `express`; add `PLATFORM_URL`/token usage |
| `apps/api/src/server.js` | **Create** — Express app; mounts control routes + webhook; `x-engine-token` guard |
| `apps/api/src/platform.js` | **Create** — client: `getCurrentCoffee()`, `savePost()`, `upsertCoffee()`, `getSchedule()`, `uploadImage()` |
| `apps/api/src/index.js` | Modify — start server + scheduler |
| `apps/api/src/scheduler.js` | Modify — load schedule from platform; expose `reschedule()` for `/config/schedule` |
| `apps/api/src/content-types/*.js` | Modify — read coffee via platform; write `Post` via platform; R2 image; try/catch→`failed` |
| `apps/api/src/webhooks/whatsapp.js` | Modify — write coffee to platform (not file); handle approval replies |
| `apps/api/src/generators/image.js` | Modify — return image for R2 upload (not just temp path) |
| `apps/api/config/coffee.json` | **Delete** — DB is source of truth |
| `apps/api/config/schedule.json` | Keep as fallback defaults only |

### Platform (`apps/web`) — small contract-completing edits
| File | Action |
|------|--------|
| `apps/web/src/app/api/admin/coffee/route.ts` | Modify — accept engine token on POST (for webhook writes) |
| `apps/web/src/app/api/admin/schedule/route.ts` | Modify — add engine-token GET (boot load) |
| `apps/web/src/app/api/upload/route.ts` | Modify — accept engine token (durable post images) |
| `apps/web/src/app/api/admin/engine/route.ts` | Modify — **remove duplicate `db.post.create`** (engine now owns writeback) |

### Config / docs
| File | Action |
|------|--------|
| `.env.example` · `docs/strategy/railway-env-vars.md` | Add `PLATFORM_URL`, `ENGINE_SECRET_TOKEN` (engine); confirm `CBC_ENGINE_URL`, `ENGINE_SECRET_TOKEN` (web); R2 creds on engine |

---

## Phase 1 — Single source of truth (non-negotiable; fixes the core disconnect)

### Task 1: Engine HTTP server + platform client

**Files:** Create `apps/api/src/server.js`, `apps/api/src/platform.js`; modify `apps/api/src/index.js`, `apps/api/package.json`.

- [ ] **Add `express` to `apps/api/package.json`** dependencies.

- [ ] **Create `src/platform.js`** — the engine's only door to the platform:

```js
const axios = require('axios');
const BASE = process.env.PLATFORM_URL || 'http://localhost:3000';
const TOKEN = process.env.ENGINE_SECRET_TOKEN || '';
const h = { 'x-engine-token': TOKEN, 'Content-Type': 'application/json' };

async function getCurrentCoffee() {
  const res = await axios.get(`${BASE}/api/coffee/current`, { headers: h });
  return res.data; // DB Coffee row, or throws on 404
}

async function savePost(post) {
  // post: { platform, contentType, caption, imageUrl?, imagePrompt?, status, platformPostId?, errorMsg?, coffeeId? }
  const res = await axios.post(`${BASE}/api/admin/posts`, post, { headers: h });
  return res.data;
}

async function upsertCoffee(coffee) {
  const res = await axios.post(`${BASE}/api/admin/coffee`, coffee, { headers: h });
  return res.data;
}

async function getSchedule() {
  const res = await axios.get(`${BASE}/api/admin/schedule`, { headers: h });
  return res.data;
}

module.exports = { getCurrentCoffee, savePost, upsertCoffee, getSchedule };
```

- [ ] **Create `src/server.js`** — Express app honoring the contract:

```js
const express = require('express');
const scheduler = require('./scheduler');
const platform = require('./platform');
const { verifyWebhook, handleWebhook } = require('./webhooks/whatsapp');

const productPost  = require('./content-types/product-post');
const coffeeStory  = require('./content-types/coffee-story');
const linkedinPost = require('./content-types/linkedin-post');
const seasonal     = require('./content-types/seasonal');
const RUNNERS = { 'product-post': productPost, 'coffee-story': coffeeStory, 'linkedin-post': linkedinPost, 'seasonal': seasonal };

const app = express();
app.use(express.json());

// Meta requires an unauthenticated GET verify + POST for the webhook
app.get('/webhooks/whatsapp', verifyWebhook);
app.post('/webhooks/whatsapp', handleWebhook);

// Everything else is engine-token protected
app.use((req, res, next) => {
  if (req.headers['x-engine-token'] !== process.env.ENGINE_SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/health', async (req, res) => {
  let currentCoffee = '—';
  try { currentCoffee = (await platform.getCurrentCoffee()).name; } catch {}
  res.json({ status: 'running', currentCoffee, lastUpdated: new Date().toISOString(), nextPosts: scheduler.nextPosts() });
});

app.post('/trigger/:type', async (req, res) => {
  const runner = RUNNERS[req.params.type];
  if (!runner) return res.status(400).json({ error: 'Unknown type' });
  try { res.json(await runner.run()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/preview', async (req, res) => {
  const runner = RUNNERS[req.body.type];
  if (!runner || !runner.preview) return res.status(400).json({ error: 'Unknown type' });
  try { res.json(await runner.preview()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/config/schedule', async (req, res) => {
  scheduler.reschedule(req.body);
  res.json({ ok: true });
});

app.post('/config/coffee', (req, res) => res.json({ ok: true })); // DB is truth; warm-cache no-op

module.exports = app;
```

- [ ] **Modify `src/index.js`** to start both:

```js
require('dotenv').config();
const app = require('./server');
const scheduler = require('./scheduler');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CBC Engine HTTP on :${PORT}`));
scheduler.start().then(() => console.log('CBC Content Engine scheduler running'));
```

- [ ] **Verify** `GET /health` returns `status: "running"` and the admin generator page (`/admin/marketing/generator`) flips to "Motor: Activo".

---

### Task 2: Read current coffee from the DB, not the file

**Files:** Modify all `apps/api/src/content-types/*.js`.

- [ ] **Replace file reads** in `product-post.js`, `coffee-story.js`, `linkedin-post.js`, `seasonal.js`:

```diff
- const coffee = require('../../config/coffee.json').current;
+ const platform = require('../platform');
+ const coffee = await platform.getCurrentCoffee();
```

- [ ] **Confirm shape tolerance:** `generators/copy.js` `JSON.stringify(data.coffee)` into prompts, so the DB `Coffee` shape (`originRegion`, `originCountry`, `originFarm`, `variety`, `process`, `roast`, `tastingNotes[]`, `story`, `brewGuide`) flows through without prompt changes. Keep `coffee.id` around — it's needed as `coffeeId` when saving posts (Task 3).

- [ ] **Delete `apps/api/config/coffee.json`** and remove the `_note` reference.

---

### Task 3: Persist every post to `Post` history (the missing writeback)

**Files:** Modify all `apps/api/src/content-types/*.js`; modify `apps/web/src/app/api/admin/engine/route.ts`.

- [ ] **In each content-type `run()`**, record success/failure per platform. Pattern (product-post shown):

```js
async function run(platforms = ['instagram', 'facebook']) {
  const platform = require('../platform');
  let imagePath = null;
  try {
    const coffee = await platform.getCurrentCoffee();
    const [caption, imagePromptRaw] = await Promise.all([
      generateCaption('productPost', { coffee }),
      generateImagePrompt('productPost', { coffee }),
    ]);
    imagePath = await generateImage(imagePromptRaw);
    const imageUrl = await platform.uploadImage(imagePath); // Task 6 (R2)

    for (const p of platforms) {
      try {
        const publish = p === 'instagram' ? publishToInstagram : publishToFacebook;
        const platformPostId = await publish(imagePath, caption);
        await platform.savePost({ platform: p, contentType: 'product-post', caption, imageUrl,
          imagePrompt: imagePromptRaw, status: 'published', platformPostId, coffeeId: coffee.id });
      } catch (err) {
        await platform.savePost({ platform: p, contentType: 'product-post', caption, imageUrl,
          status: 'failed', errorMsg: err.message, coffeeId: coffee.id });
        console.error(`${p} publish failed:`, err.message);
      }
    }
  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
}
```

  `POST /api/admin/posts` already validates exactly this shape (`postSchema`) and sets `publishedAt` when `status: 'published'`.

- [ ] **Reconcile the double-write:** `apps/web/src/app/api/admin/engine/route.ts` `publish` action currently calls `triggerPost()` **and then** loops `db.post.create(...)`. Once the engine's `/trigger` writes posts itself, that loop double-inserts. **Remove the `db.post.create` loop** from the `publish` case; keep only `triggerPost()` and return its result. The engine is now the single owner of `Post` writeback (cron and manual both flow through `/trigger`).

- [ ] **Idempotency guard (prevents double-posting).** Distributed-scheduling guidance is unanimous: *favor skipping over double-launching* — a skipped post is recoverable, a duplicate public post is not. Two ways this system can double-fire today: the same cron slot runs twice (redeploy/overlap), or the auto path and a manual `/trigger` collide. Before publishing, derive an idempotency key `${contentType}:${YYYY-MM-DD}` (or the season name) and **skip if a `published` `Post` already exists for that key**. Add `GET /api/admin/posts?type=&since=` (a narrow query the route already half-supports) so the engine can check. This makes retries (below) safe by construction.

- [ ] **Bounded retry with backoff.** Wrap each `publish()` and each `savePost()` in a short exponential-backoff retry (e.g. 3 attempts) — Meta/LinkedIn and the platform writeback all have transient failure modes. Safe because publishing is now idempotent. On final failure, record `status: 'failed'` + `errorMsg`.

- [ ] **Verify** a triggered post appears in `/admin/marketing/history` with correct status, platform icon, and thumbnail.

---

### Task 4: Schedule from the DB, not `schedule.json`

**Files:** Modify `apps/api/src/scheduler.js`; modify `apps/web/src/app/api/admin/schedule/route.ts`.

- [ ] **Add an engine-token GET path to `/api/admin/schedule`** (mirror the pattern in `/api/coffee/current`) so the engine can load the schedule on boot. It returns the merged `DEFAULT_SCHEDULE` + `Setting.schedule.*` object the schedule page already builds.

- [ ] **Rework `scheduler.js`** to be DB-driven and live-reschedulable:

```js
const cron = require('node-cron');
const platform = require('./platform');
const fallback = require('../config/schedule.json');
const RUNNERS = { /* productPost, coffeeStory, linkedinPost, seasonal */ };
let jobs = [];

async function start() {
  let schedule;
  try { schedule = await platform.getSchedule(); }
  catch { schedule = fallback.posts; } // engine can boot even if platform is briefly down
  reschedule(schedule);
}

function reschedule(schedule) {
  jobs.forEach((j) => j.stop());
  jobs = [];
  for (const [key, cfg] of Object.entries(schedule)) {
    if (!cfg.active) continue;
    const job = cron.schedule(cfg.cron, () => RUNNERS[key]?.run(cfg.platforms), { timezone: 'America/Mexico_City' });
    jobs.push(job);
  }
  // keep the daily 8am seasonal check
}

function nextPosts() { /* compute upcoming fire times for /health */ return []; }

module.exports = { start, reschedule, nextPosts };
```

- [ ] **Verify** editing the schedule in `/admin/marketing/schedule` (which writes `Setting.schedule.*` then calls `setEngineSchedule`) reaches the engine `/config/schedule` and re-registers jobs without a redeploy.

---

### Task 5: WhatsApp coffee updates write to the DB, not the file

**Files:** Modify `apps/api/src/webhooks/whatsapp.js`; modify `apps/web/src/app/api/admin/coffee/route.ts`.

- [ ] **Verify the webhook signature (security — the current check is spoofable).** Today `handleWebhook` only checks `senderPhone === LORENA_PHONE`, but the payload itself is never authenticated — anyone who learns the URL can POST a forged body claiming to be from Lorena's number and trigger a coffee change. Meta signs every payload with `X-Hub-Signature-256`. **Compute HMAC-SHA256 of the _raw_ request body with the Meta App Secret and compare with `crypto.timingSafeEqual`; reject on mismatch _before_ any processing.** This requires capturing the raw body in Express (`express.json({ verify: (req, _res, buf) => { req.rawBody = buf } })`), since parsed JSON can't be re-serialized byte-identically. Keep the `LORENA_PHONE` check as a second factor.

- [ ] **Add an engine-token path to `POST /api/admin/coffee`** (currently session-only). Mirror `/api/admin/posts`: accept the request if `x-engine-token` matches, then run the existing deactivate-all + create-active logic. This lets the webhook upsert coffee without a user session.

- [ ] **Rewrite `handleCoffeeUpdate`** to call the platform instead of writing `coffee.json`:

```js
const coffeeData = await parseCoffeeUpdate(message); // Claude → structured
// Map the nested {origin:{country,region,farm}} shape to the DB Coffee columns:
const saved = await platform.upsertCoffee({
  name: coffeeData.name,
  originCountry: coffeeData.origin?.country || 'México',
  originRegion:  coffeeData.origin?.region,
  originFarm:    coffeeData.origin?.farm,
  variety: coffeeData.variety, process: coffeeData.process, roast: coffeeData.roast,
  tastingNotes: coffeeData.tastingNotes || [], story: coffeeData.story,
});
await sendWhatsAppMessage(senderPhone, `✓ Café actualizado: *${saved.name}* …`);
```

  Note `parseCoffeeUpdate`'s system prompt must produce a `tastingNotes` array with ≥1 item (the platform's `coffeeSchema` requires `.min(1)`); tighten the prompt if needed.

- [ ] **Delete the `coffee.json` file-write code** and the `COFFEE_CONFIG_PATH` constant.

- [ ] **Verify** texting "café nuevo …" from `LORENA_PHONE` creates/activates a `Coffee` row visible in `/admin/marketing/coffee`, and the next generated post uses it.

---

## Phase 2 — Reliability

### Task 6: Persist post images to R2 (durable thumbnails)

**Files:** Modify `apps/api/src/generators/image.js`, add `uploadImage` to `platform.js`; modify `apps/web/src/app/api/upload/route.ts`.

- [ ] **Problem:** DALL-E URLs and local `tmp/` paths are ephemeral, so `Post.imageUrl` in history would break. Route images through R2 (the platform already has `lib/r2.ts` + `/api/upload`).

- [ ] **Add engine-token acceptance to `/api/upload`**, then implement `platform.uploadImage(localPath)` to POST the file and return the R2 URL. Use that URL as `imageUrl` in every `savePost` (Task 3). Alternative: give the engine its own R2 credentials + `@aws-sdk/client-s3` and upload directly — pick whichever keeps R2 creds in one service (prefer routing through the platform).

- [ ] **Verify** history thumbnails still load a day after publishing.

### Task 7: Surface failures

- [ ] **On any `status: 'failed'` writeback**, also `sendWhatsAppMessage(LORENA_PHONE, …)` so a missed post is visible, not just a `console.error`. Failed posts already render with a red ✗ in history.

---

## Phase 3 — Trust (one-tap approval; the one net-new feature)

### Task 8: WhatsApp approval loop for LinkedIn + seasonal

**Files:** Modify `apps/api/src/content-types/linkedin-post.js`, `seasonal.js`, `webhooks/whatsapp.js`.

- [ ] **Split generate from publish** for approval-gated types. On cron fire: generate caption + R2 image, `savePost({ status: 'scheduled', … })` (the `Post` row is the approval queue — schema already has `scheduled`), then WhatsApp Lorena a preview (image + caption) asking for 👍 to publish / ✏️ to edit / 👎 to discard.

- [ ] **Extend `handleWebhook`** to detect approval replies from `LORENA_PHONE` referencing the pending `Post` (e.g. reply "publicar" / "1"). On approve: publish to the platform API, update the `Post` to `published` with `platformPostId`. On reject: mark `failed`/discarded.
  - Needs a platform endpoint to fetch the latest `scheduled` post and to flip its status (extend `/api/admin/posts` with `GET ?status=scheduled` and a `PATCH`).

- [ ] **Keep IG/FB product & coffee posts fully auto** (per CBC.md "no daily involvement") — approval applies only to LinkedIn (Lorena's professional face) and seasonal campaigns. Make the gate a per-type flag in the schedule config so it's adjustable without code.

- [ ] **Add a programmatic output guard (cheap, protects the auto path too).** Best practice for autonomous LLM publishing is layered guards: the `SYSTEM_PROMPT` is already a strong *input* guard, but there's no *output* check. Before any post publishes (auto or approved), run a deterministic validator over the generated caption against the brand NEVER-list already documented in `copy.js`: forbidden words (`premium`, `artesanal`, `de calidad`, `delicioso`, `único`), any mention of Lorena's Colombian origin, and **>2 hashtags**. On violation, either auto-regenerate once or divert to `scheduled` (manual review) instead of publishing. This catches the "drift off-brand at 3am with no human in the loop" failure mode without adding human effort.

- [ ] **Verify** a scheduled LinkedIn post is not published until Lorena replies 👍, and the history reflects `scheduled → published`.

---

## Phase 4 — Optimization (future, not now)

- Periodic job pulls reach/likes per `platformPostId` from the Graph API onto `Post` rows, enabling the content-pillar mix (Coffee 40 / Gift 30 / Experience 20 / Knowledge 10) to be tuned by data. Explicitly out of scope for this plan.

---

## Best practices & hardening (researched)

Cross-cutting practices for this architecture — a decoupled worker/HTTP service sharing a DB with a web app over an internal API, doing scheduled social publishing with LLM-generated content and inbound webhooks. Right-sized for a single-instance, one-person business; the highest-value items are already woven into Tasks 3, 5, and 8 above.

### Scheduling & idempotency
- **Skip, never double-fire.** Distributed cron consensus (Google SRE): recovering from a skipped run is more tenable than from a double run. node-cron already skips a run if the prior one is still executing; the **idempotency key in Task 3** covers the remaining cases (redeploy overlap, auto vs. manual collision). This is the single most important reliability item — a duplicate public post is the worst-case failure here.
- **No catch-up on missed runs.** Unlike DB-backed schedulers (Hangfire), node-cron does **not** replay a slot missed while the engine was down — if the engine is offline at Mon 10am, that product post is simply skipped, not run late. Acceptable for marketing; document it. Optional mitigation: on boot, check whether today's slot has a `published` Post and, if not and it's still "today," run it once.
- **Spread the load / respect quotas.** Not urgent at this volume, but Meta/LinkedIn enforce rate limits; keep the staggered schedule (Mon/Wed/1st–15th) rather than bursting, and back off on `429`.

### Railway service topology (revises the earlier note)
- Railway's *native* cron **restarts the container each run** (starts → runs → exits; 5-min-minimum; **UTC only**). That model is wrong for CBC because the engine must be **always-on** to receive WhatsApp webhooks and serve `/health`·`/trigger`. So the correct choice here is a **single always-on worker+HTTP service using in-process `node-cron`** (which honors `America/Mexico_City` and sub-daily cadence). This is why Task 1 co-locates the server and scheduler despite Railway's general "separate them" guidance — the webhook forces an always-on process.
- **Pin the engine to a single replica** (or add a distributed lock). In-process `node-cron` on N replicas fires every job N times — a silent duplicate-post source that the idempotency key would catch but shouldn't have to. One replica is correct for this workload; note it in the Railway service config.
- **Prefer Railway private networking** for engine↔platform calls where possible, so the shared-secret traffic doesn't traverse the public internet (defense in depth on top of the token).

### Service-to-service auth (the `ENGINE_SECRET_TOKEN`)
- A static shared secret is a legitimate lightweight pattern for a trusted internal call — sufficient here. Harden it per standard guidance:
  - **Compare tokens with `crypto.timingSafeEqual`**, not `===`, on both sides (the platform routes currently use `===`) — avoids timing side-channels.
  - **Always over TLS/HTTPS** (Railway public domains are HTTPS; private networking is internal-only).
  - **Rotate the secret** periodically; it's a single Railway env var on two services, so rotation is a coordinated redeploy. Store only in Railway's env (never commit).
  - **Least privilege:** the engine token grants exactly three platform capabilities (read coffee, write posts, upsert coffee) — keep it scoped to those routes; don't reuse it for admin/session routes.

### Webhook security
- **Verify `X-Hub-Signature-256` (Task 5)** — HMAC-SHA256 over the raw body with the Meta App Secret, timing-safe compare, reject before processing. The phone-number allowlist is a second factor, not a substitute. Skipping this lets a spoofed payload change the active coffee and poison all downstream content.
- **Ack fast, process async.** The handler already returns `200` immediately — keep that; do parsing/DB work after the ack so Meta doesn't retry on a slow response.

### LLM content safety
- **Layer input + output guards.** The `SYSTEM_PROMPT` is a strong input guard; add the deterministic **output validator (Task 8)** for the brand NEVER-list and hashtag cap. Cheap, deterministic, protects the fully-auto IG/FB path.
- **Human-in-the-loop for high-stakes surfaces.** Standard guidance reserves human review for where the cost of an error exceeds the cost of oversight — here that's LinkedIn (Lorena's professional identity) and seasonal campaigns, exactly the Phase 3 approval scope.
- **Ground claims in the curated coffee record.** Prompts already inject the real `Coffee` row (a lightweight RAG-style grounding) rather than letting the model invent origin/variety/notes — keep that discipline; never let the model free-form factual coffee claims.

### Observability
- **Persist failures, don't just log them.** `status: 'failed'` + `errorMsg` on the `Post` row (Task 3) + a WhatsApp ping to Lorena (Task 7) turns silent `console.error`s into visible, actionable events.
- **Structured logs with a run id.** Tag each scheduled run with a correlation id shared by its `Post` rows, so a failed publish is traceable end-to-end in Railway logs.

**Sources:** [Google SRE — Distributed Periodic Scheduling](https://sre.google/sre-book/distributed-periodic-scheduling/) · [Azure Architecture Center — Background Jobs](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs) · [Railway — Cron, Workers & Queues](https://docs.railway.com/guides/cron-workers-queues) · [Meta — WhatsApp webhook signature verification](https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices) · [Hookdeck — SHA256 webhook signature verification](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification) · [Oso — Microservices Security Best Practices](https://www.osohq.com/learn/microservices-security) · [Contentful — LLM guardrails & governance](https://www.contentful.com/blog/llm-guardrails/) · [Hashmeta — Guardrails & brand safety in LLM outputs](https://www.hashmeta.ai/en/blog/guardrails-brand-safety-in-llm-outputs-essential-strategies-for-responsible-ai-implementation)

---

## Marketing automation best practices (researched)

The engineering plan above makes the machine *work*; this section makes it *effective*. These are marketing-discipline practices for CBC's specific shape — B2B corporate gifting, closed on WhatsApp, sold into Mexican HR/marketing teams. Right-sized for one person + an autonomous engine. Each subsection below is a numbered task (**Tasks 9–15**) folded into the single execution roadmap at the end of this plan; the data-only ones become trivial once Phase 1 lands.

### Task 9 (M) — Raise posting cadence to plan-of-record
- **Benchmark:** B2B SMBs should run **Instagram 3–5×/week**, **LinkedIn 2–3×/week**, **Facebook 2–3×/week**; consistency beats volume, and >1×/day risks fatigue. Mid-morning Tue–Thu is the sweet spot (CBC's 10am CDMX slots are already right).
- **Gap:** `schedule.json` today does IG/FB **2×/week** (Mon product + Wed coffee) and LinkedIn **2×/month** (1st & 15th). That's below benchmark *and* below CBC.md's own 90-day target ("3×/week IG/FB, 2×/month LinkedIn"). LinkedIn 2×/month in particular is far under the 2–3×/week B2B norm — and LinkedIn is where the corporate buyer actually is.
- [ ] **Raise cadence to plan-of-record and make it data-not-code.** Since the schedule is becoming DB-driven (Task 4), add a 3rd weekly IG/FB slot (e.g. Fri = experience/social-proof pillar) and move LinkedIn to **weekly** (then 2×/week once sustainable). No redeploy needed once Task 4 lands. Keep it sustainable — better 3 excellent posts than 7 mediocre.

### Task 10 (M · ★ highest ROI) — Speed-to-lead auto-acknowledgment
- **The data is stark:** replying to an inbound lead **within 5 minutes yields ~21× qualification** vs. slower; <5-min responders close at ~2.6× the rate of 24-hour responders; on WhatsApp specifically, <60-second replies convert far higher. The B2B *average* first response is measured in **hours**. For a business whose entire close happens on WhatsApp, first-response latency is the single biggest lever.
- **CBC hook:** the schema already has `Message.aiDraft` (Claude-drafted replies) and lead-notification emails ship today — but a *draft* still waits on Lorena, and Lorena is often mid-class or sourcing coffee.
- [ ] **Auto-acknowledge every inbound lead in <1 min.** On `Lead` create (quote form or WhatsApp), immediately fire an automated WhatsApp/email acknowledgment in Lorena's voice ("¡Gracias! Lorena te arma la cotización hoy mismo — mientras tanto, ¿para qué ocasión y cuántas cajas?") using the existing WhatsApp send + `notifications.ts`. This captures the 5-minute window even when Lorena can't, then hands off to her `aiDraft` for the real reply. **Never auto-send the actual quote/price** — acknowledgment only; the consultative close stays human.
- [ ] **Track first-response time.** Stamp `Lead`/`Message` so the dashboard can show median time-to-first-touch — the one metric most correlated with close rate here.

### Task 11 (M) — Stage-based lead nurturing
- **Best practice:** stagger messages by funnel stage — active nurture for new leads, lighter check-ins mid-funnel, quiet cadence for existing customers; segment by intent/behavior; WhatsApp campaigns convert 3–5× vs. traditional channels when segmented.
- **CBC hook:** `Lead.status` (new→contacted→quoted→confirmed→lost), `Lead.occasion`, and `Customer.tags`/`industry` already model the segments; nothing acts on them yet.
- [ ] **Stage-based follow-up automation.** A scheduled engine job that nudges stalled leads: quote sent but no reply after 48h → gentle WhatsApp follow-up; `lost` after a season → re-engage before the *next* occasion. Drive it off `Lead.status` + `Lead.occasion` transitions. Keep templates human-reviewed (reuses the Phase 3 approval muscle).

### Task 12 (M · mostly data-only) — Seasonal timing & Q3 micro-campaign
- **Best practice:** tie campaigns to holidays/occasions; **start early** (buyers plan corporate gifts weeks ahead); counter-intuitively, **off-peak (Q3/back-to-office) generates cheaper B2B leads than the December crush** because there's less noise.
- **CBC hook:** `schedule.json` seasons (Fin de año, Día del Amor, Día del Trabajo) already encode this, and the campaign windows start weeks before peak — good. But they lean on the crowded peaks.
- [ ] **Lead the season, don't chase it.** Confirm campaign *start* dates give ~6–8 weeks of runway before peak (Fin de año already starts 10-15 for a 12-15 peak — keep that pattern for all). Consider a low-noise **Q3 "back-to-office / onboarding kits"** micro-campaign (Aug–Sep) — cheaper leads, and CBC.md already lists onboarding as a buy occasion. Add it as a season row (data-only once Task 4 lands).

### Task 13 (M) — Activate the social-proof content pillar
- **Best practice:** consistent multi-pillar mix; **social proof / UGC** is among the highest-converting B2B content (a received gift makes 83% of clients "feel closer" to the sender — that testimonial *is* the asset).
- **CBC hook:** `copy.js` already defines 4 pillars (Coffee 40 / Gift 30 / Experience 20 / Knowledge 10), and — tellingly — the `Post` history UI already has a **`social-proof`** content type label, but no generator produces it.
- [ ] **Add a `social-proof` content type.** Generate posts from delivered-order moments and client reactions (with permission) — unboxing, the branded box on a real desk, a team at Lorena's live class. This is the missing highest-intent pillar and it maps to an existing `contentType`. Feeds the proposed 3rd weekly IG slot above.
- [ ] **Keep factual grounding.** Coffee-pillar claims must come from the active `Coffee` row (already the case) — never let the model invent origin/notes for a story post.

### Task 14 (M · lightweight) — Referral & testimonial post-delivery ask
- **CBC hook:** CBC.md's 12-month goal explicitly wants "a referral program generating leads passively" and "returning customers, different seasons." The CRM (`Customer`, repeat `Order`s) already supports measuring this.
- [ ] **Post-delivery ask.** On `Order.status → delivered`, trigger a WhatsApp that (a) requests a photo/testimonial (feeds social-proof pillar) and (b) offers a referral incentive. Low effort, compounding return. Defer until Phases 1–3 land.

### Task 15 (M) — Funnel & response-time dashboard
- **Best practice:** track pipeline generated, opportunities, conversion rate, deal velocity — not vanity metrics.
- [ ] **Marketing dashboard tie-in.** Once `Post` engagement pull-back exists (technical Phase 4) and lead-response timing is stamped (above), surface on the admin dashboard: posts→leads→quotes→orders funnel, first-response median, and revenue by season/occasion. This is what tells Lorena which *pillar and season* actually drive orders, so the mix can be tuned by evidence rather than the fixed 40/30/20/10.

**Sources:** [ThinkPod — B2B posting frequency 2025](https://thinkpodagency.com/how-often-should-b2b-companies-post-on-linkedin-and-other-platforms-a-practical-guide/) · [Hootsuite — How often to post (2025 data)](https://blog.hootsuite.com/how-often-to-post-on-social-media/) · [Setter AI — Sales response-time statistics 2026](https://www.trysetter.com/blog/sales-response-time-statistics-2026) · [Nutshell — WhatsApp Business for B2B](https://www.nutshell.com/blog/whatsapp-business-for-b2b) · [Flowcart — WhatsApp lead nurturing](https://www.flowcart.ai/blog/whatsapp-lead-nurturing) · [Sendoso — Corporate gifting playbook](https://www.sendoso.com/resources/blog/from-seasonal-to-strategic-the-complete-corporate-gifting-playbook) · [Postal — Gifts for B2B lead generation](https://www.postal.com/blog/leveraging-gifts-for-b2b-lead-generation) · [Reachdesk — Corporate gifting ROI](https://www.reachdesk.com/blog/how-to-create-a-corporate-gifting-strategy-that-delivers-roi)

---

## Env & deploy

- [ ] **Engine (`cbc-engine` Railway service):** `PLATFORM_URL=https://www.coffeebunncafe.com`, `ENGINE_SECRET_TOKEN=<shared>`, plus existing `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, Meta/LinkedIn/WhatsApp tokens, `LORENA_PHONE`, `PORT`.
- [ ] **Platform (`web`):** `CBC_ENGINE_URL=https://<engine>.railway.app`, `ENGINE_SECRET_TOKEN=<same shared>` (already referenced by `lib/engine.ts` and the token-guarded routes).
- [ ] **Point Meta's WhatsApp webhook** at `https://<engine>.railway.app/webhooks/whatsapp` (verify token = `WHATSAPP_VERIFY_TOKEN`).
- [ ] Document all of the above in `.env.example` and `docs/strategy/railway-env-vars.md`.

## Build & version

- [ ] Per `AGENTS.md`, bump the version tag on each push to `main` (`v1.3.x feat: …`), tagging before push.
- [ ] Verify:
```bash
pnpm --filter @cbc/db build && pnpm --filter @cbc/web build
node apps/api/src/index.js   # smoke: /health, /trigger/product-post against a running platform
```

---

## Unified execution roadmap

The engineering track (E) and marketing track (M) reconciled into one dependency- and value-ordered sequence. Everything hangs off **Milestone 1** — until the engine honors the contract and config is DB-driven, nothing else can run. After that, the ordering is by value-per-effort, interleaving E and M.

| # | Milestone | Task | Track | Notes |
|---|-----------|------|-------|-------|
| 1 | **M1 · Foundation** *(non-negotiable; unblocks all)* | Task 1 — Engine HTTP server + platform client | E | The whole contract; `lib/engine.ts` starts working |
| 2 | | Task 2 — Read current coffee from DB | E | Kills file-state read |
| 3 | | Task 3 — Post writeback + **idempotency** + retries | E | Makes admin history real; no double-posts |
| 4 | | Task 4 — Schedule from DB | E | **Unlocks all data-only marketing config** |
| 5 | | Task 5 — WhatsApp → DB + **signature verification** | E · security | Closes the spoofable-webhook hole |
| 6 | **M2 · Quick wins** *(right after M1; top ROI, low effort)* | Task 10 — Speed-to-lead auto-ack + response tracking | M ★ | **Single highest-ROI item in the plan** (~21× qualification within 5 min) |
| 7 | | Task 9 — Raise posting cadence to plan | M | Data-only once Task 4 lands |
| 8 | | Task 12 — Add Q3 back-to-office season | M | Data-only; cheaper off-peak leads |
| 9 | **M3 · Reliability** | Task 6 — Post images to R2 | E | Durable history thumbnails |
| 10 | | Task 7 — Surface failures to WhatsApp | E | No silent misses |
| 11 | **M4 · Trust + content quality** | Task 8 — WhatsApp approval loop + **output guard** | E · trust | Brand-safe public posts |
| 12 | | Task 13 — `social-proof` content pillar | M | Highest-intent pillar; feeds 3rd weekly slot |
| 13 | **M5 · Nurture & growth** | Task 11 — Stage-based lead nurture | M | Reuses the approval muscle from Task 8 |
| 14 | | Task 14 — Referral / testimonial post-delivery ask | M | Seeds the 12-month referral goal |
| 15 | **M6 · Optimization & measurement** | Technical Phase 4 — engagement pull-back | E | Reach/likes per `platformPostId` onto `Post` |
| 16 | | Task 15 — Funnel & response-time dashboard | M | Tune pillar mix + cadence by evidence |

**Dependency notes:**
- **M1 gates everything.** Tasks 9, 12 (data-only config) literally cannot exist until Task 4 makes the schedule/seasons DB-editable.
- **Task 10 (speed-to-lead)** depends only on M1's lead flow + the existing `notifications.ts`/WhatsApp send — not on the approval or reliability work — which is why it jumps ahead of M3/M4 despite being a marketing item.
- **Task 8 before Tasks 11 & 13:** the approval loop builds the `scheduled`→`published` + WhatsApp-reply machinery that stage-based nurture (11) and reviewed social-proof posts (13) reuse.
- **Task 6 (R2) before Task 13:** social-proof posts carry client photos that must live somewhere durable.
- **Task 15 depends on Technical Phase 4** (engagement data) + Task 10 (response-time stamps) to be meaningful.

**If you only ship one milestone:** M1 alone fixes the core disconnect and makes the already-built admin module real. **If you ship two:** add M2 — auto-ack + cadence are the cheapest points of leverage on actual revenue.

## Explicit non-goals

- **No merging the two services.** The long-running cron engine stays separate from the request/response web app; they share the DB + R2 over HTTP, not a process.
- **No new Prisma models** — the schema already supports every step.
- **No campaign suite / A-B testing / multi-brand.** One person, one brand, four post types.
- **Not more autonomy** — the gap is observability and trust, not intelligence.
