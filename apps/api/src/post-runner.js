/**
 * Shared post pipeline. Every content type flows through here:
 *
 *   idempotency check → coffee from DB → caption + image (Claude/DALL-E)
 *   → brand guard → R2 upload → publish (or queue for approval)
 *   → Post writeback → failure alerts → temp cleanup
 *
 * Design rules (see docs/superpowers/plans/2026-07-11-marketing-engine-db-integration.md):
 *  - Skip, never double-fire: a skipped post is recoverable, a duplicate isn't.
 *  - Every outcome becomes a Post row (published | failed | scheduled).
 *  - Approval-gated types (LinkedIn, seasonal) save as 'scheduled' and ping Lorena.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const { generateCaption, generateImagePrompt } = require('./generators/copy');
const { generateImage, cleanupImage } = require('./generators/image');
const { publishToInstagram, publishToFacebook } = require('./publishers/meta');
const { publishToLinkedIn } = require('./publishers/linkedin');
const platform = require('./platform');
const { validateCaption } = require('./guard');
const { notifyLorena } = require('./wa');

const PUBLISHERS = {
  instagram: publishToInstagram,
  facebook: publishToFacebook,
  linkedin: publishToLinkedIn,
};

// If the platform has no active coffee yet, content still generates against
// the honest generic story rather than crashing the schedule.
const DEFAULT_COFFEE = {
  id: undefined,
  name: 'Café de Especialidad CBC',
  originCountry: 'México',
  originRegion: 'Chiapas',
  variety: null,
  process: null,
  roast: 'Medio',
  tastingNotes: [],
  story:
    'Lorena selecciona el mejor micro-lote disponible para cada pedido. El café cambia con la temporada y el productor.',
};

async function getCoffee() {
  try {
    return await platform.getCurrentCoffee();
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn('No active coffee in DB — using generic default');
      return DEFAULT_COFFEE;
    }
    throw err;
  }
}

/**
 * Idempotency: has this content type already produced a post (published or
 * queued) within the window? Uses a rolling window instead of TZ-day math.
 */
async function alreadyRan(contentType, windowHours = 20) {
  try {
    const posts = await platform.findPosts({ type: contentType, limit: 10 });
    const cutoff = Date.now() - windowHours * 3600 * 1000;
    return posts.some(
      (p) =>
        (p.status === 'published' || p.status === 'scheduled') &&
        new Date(p.createdAt).getTime() >= cutoff
    );
  } catch (err) {
    // Platform unreachable → the coffee fetch will fail anyway; don't mask it here
    console.warn('Idempotency check failed (continuing):', err.message);
    return false;
  }
}

/**
 * Generate a caption and enforce the brand guard.
 * One regeneration attempt; if it still violates, force approval mode so a
 * human reviews it instead of it publishing (or dying) unsupervised.
 */
async function generateGuardedCaption(promptKey, data) {
  let caption = await generateCaption(promptKey, data);
  let check = validateCaption(caption);
  if (check.ok) return { caption, forcedApproval: false };

  console.warn(`Guard violations (${promptKey}), regenerating:`, check.violations.join('; '));
  caption = await generateCaption(promptKey, data);
  check = validateCaption(caption);
  if (check.ok) return { caption, forcedApproval: false };

  console.warn(`Guard still failing — diverting to manual approval:`, check.violations.join('; '));
  return { caption, forcedApproval: true, violations: check.violations };
}

/**
 * Run one content type end to end.
 * opts: { contentType, promptKey, platforms, data?, requireApproval?, windowHours? }
 */
async function runPost(opts) {
  const {
    contentType,
    promptKey,
    platforms = ['instagram', 'facebook'],
    data = {},
    requireApproval = false,
    windowHours = 20,
  } = opts;

  console.log(`▶ Running ${contentType}...`);

  if (await alreadyRan(contentType, windowHours)) {
    console.log(`↷ ${contentType} already ran within ${windowHours}h — skipping (idempotency)`);
    return { skipped: true };
  }

  let imagePath = null;
  try {
    const coffee = await getCoffee();
    const genData = { coffee, ...data };

    const [guarded, imagePromptRaw] = await Promise.all([
      generateGuardedCaption(promptKey, genData),
      generateImagePrompt(promptKey, genData),
    ]);
    const { caption, forcedApproval, violations } = guarded;

    imagePath = await generateImage(imagePromptRaw);

    // Durable image first — Post rows and approval previews need a real URL
    let imageUrl;
    try {
      imageUrl = await platform.uploadPostImage(imagePath);
    } catch (err) {
      console.warn('R2 upload failed (continuing with publish):', err.message);
    }

    const base = {
      contentType,
      caption,
      imageUrl,
      imagePrompt: imagePromptRaw,
      coffeeId: coffee.id,
    };

    // ── Approval path: queue as 'scheduled', ping Lorena, stop ──
    if (requireApproval || forcedApproval) {
      for (const p of platforms) {
        await platform.savePost({ ...base, platform: p, status: 'scheduled' });
      }
      const reason = forcedApproval
        ? `⚠️ El guard de marca detectó: ${violations.join('; ')}\n\n`
        : '';
      await notifyLorena(
        `📝 *Post pendiente de aprobación* (${contentType} → ${platforms.join(', ')})\n\n` +
          reason +
          `${caption}\n\n` +
          (imageUrl ? `Imagen: ${imageUrl}\n\n` : '') +
          `Responde *publicar* para aprobarlo o *descartar* para cancelarlo.`
      );
      console.log(`⏸ ${contentType} queued for approval (${platforms.join(', ')})`);
      return { scheduled: true, platforms };
    }

    // ── Auto path: publish per platform, record each outcome ──
    const results = {};
    for (const p of platforms) {
      const publish = PUBLISHERS[p];
      if (!publish) continue;
      try {
        const platformPostId = await platform.withRetry(() => publish(imagePath, caption), {
          retries: 2,
          delayMs: 2000,
        });
        results[p] = platformPostId;
        await savePostSafe({ ...base, platform: p, status: 'published', platformPostId });
      } catch (err) {
        console.error(`${p} publish failed:`, err.message);
        results[p] = null;
        await savePostSafe({ ...base, platform: p, status: 'failed', errorMsg: err.message });
        await notifyLorena(
          `❌ *Falló un post automático*\nTipo: ${contentType}\nPlataforma: ${p}\nError: ${err.message}`
        );
      }
    }

    console.log(`✓ ${contentType} done`, results);
    return results;
  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
}

/** Post writeback must never crash the pipeline mid-publish. */
async function savePostSafe(post) {
  try {
    await platform.savePost(post);
  } catch (err) {
    console.error('Post writeback failed:', err.message, JSON.stringify(post.platform));
  }
}

/** Preview: generate everything, publish nothing, save nothing. */
async function preview(promptKey, data = {}) {
  let imagePath = null;
  try {
    const coffee = await getCoffee();
    const genData = { coffee, ...data };
    const [caption, imagePromptRaw] = await Promise.all([
      generateCaption(promptKey, genData),
      generateImagePrompt(promptKey, genData),
    ]);
    imagePath = await generateImage(imagePromptRaw);
    let imageUrl;
    try {
      imageUrl = await platform.uploadPostImage(imagePath);
    } catch {
      imageUrl = '';
    }
    return { caption, imageUrl, imagePrompt: imagePromptRaw };
  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
}

// ─── Approval resolution (called from the WhatsApp webhook) ──────────────────

async function downloadToTmp(url) {
  const tmpDir = path.join(__dirname, '../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filepath = path.join(tmpDir, `approved_${Date.now()}.jpg`);
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filepath, res.data);
  return filepath;
}

/** Publish all posts waiting in the 'scheduled' queue. Returns a summary string. */
async function publishScheduled() {
  const posts = await platform.findPosts({ status: 'scheduled', limit: 10 });
  if (posts.length === 0) return 'No hay posts pendientes de aprobación.';

  const lines = [];
  for (const post of posts) {
    let imagePath = null;
    try {
      const publish = PUBLISHERS[post.platform];
      if (!publish) throw new Error(`Plataforma desconocida: ${post.platform}`);
      if (!post.imageUrl) throw new Error('El post no tiene imagen guardada');

      imagePath = await downloadToTmp(post.imageUrl);
      const platformPostId = await platform.withRetry(() => publish(imagePath, post.caption), {
        retries: 2,
        delayMs: 2000,
      });
      await platform.updatePost(post.id, { status: 'published', platformPostId });
      lines.push(`✓ ${post.platform}: publicado`);
    } catch (err) {
      console.error(`Approved publish failed (${post.platform}):`, err.message);
      await platform
        .updatePost(post.id, { status: 'failed', errorMsg: err.message })
        .catch(() => {});
      lines.push(`❌ ${post.platform}: ${err.message}`);
    } finally {
      if (imagePath) cleanupImage(imagePath);
    }
  }
  return lines.join('\n');
}

/** Discard the pending queue (back to draft, marked as discarded). */
async function discardScheduled() {
  const posts = await platform.findPosts({ status: 'scheduled', limit: 10 });
  if (posts.length === 0) return 'No hay posts pendientes de aprobación.';
  for (const post of posts) {
    await platform
      .updatePost(post.id, { status: 'draft', errorMsg: 'Descartado por Lorena' })
      .catch(() => {});
  }
  return `Descartados ${posts.length} post(s). No se publicará nada.`;
}

module.exports = { runPost, preview, publishScheduled, discardScheduled };
