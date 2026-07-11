/**
 * WhatsApp inbound webhook (Meta Cloud API).
 *
 * Security layers (both required):
 *  1. X-Hub-Signature-256 — HMAC-SHA256 of the RAW body with the Meta App
 *     Secret, compared timing-safe. Without this, anyone who learns the URL
 *     can forge a "from Lorena" payload and poison the active coffee.
 *  2. Sender allowlist — only LORENA_PHONE triggers actions.
 *
 * Commands (from Lorena):
 *  - "café nuevo …"        → Claude parses → Coffee row in the platform DB
 *  - "publicar" / "aprobar" → publish the pending 'scheduled' posts
 *  - "descartar" / "rechazar" → discard the pending queue
 */
const crypto = require('crypto');
const platformClient = require('../platform');
const { parseCoffeeUpdate } = require('../generators/copy');
const { sendWhatsAppMessage } = require('../wa');
const postRunner = require('../post-runner');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Webhook verification (required by Meta on setup)
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

/** HMAC-SHA256 signature check over the raw body (timing-safe). */
function verifySignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!secret) {
    console.warn('META_APP_SECRET not set — webhook signature NOT verified (set it in production)');
    return true;
  }
  const header = req.headers['x-hub-signature-256'];
  if (!header || !req.rawBody) return false;

  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Incoming message handler
async function handleWebhook(req, res) {
  // Authenticate the payload BEFORE any processing
  if (!verifySignature(req)) {
    console.warn('WhatsApp webhook: invalid X-Hub-Signature-256 — rejected');
    return res.sendStatus(403);
  }
  res.sendStatus(200); // ack fast; process async

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const senderPhone = message.from;
    const text = message.text.body.trim();

    // Only Lorena can drive the engine
    if (senderPhone !== process.env.LORENA_PHONE) return;

    console.log(`WhatsApp message from Lorena: ${text}`);

    const lower = text.toLowerCase();

    const isCoffeeUpdate =
      lower.includes('café nuevo') ||
      lower.includes('cafe nuevo') ||
      lower.includes('nuevo café') ||
      lower.includes('nuevo cafe') ||
      lower.includes('new coffee');

    const isApprove = /^(publicar|aprobar|aprueba|s[ií],? publicar)\b/.test(lower);
    const isDiscard = /^(descartar|rechazar|no publicar|cancelar)\b/.test(lower);

    if (isCoffeeUpdate) {
      await handleCoffeeUpdate(text, senderPhone);
    } else if (isApprove) {
      const summary = await postRunner.publishScheduled();
      await sendWhatsAppMessage(senderPhone, `📤 *Resultado:*\n${summary}`);
    } else if (isDiscard) {
      const summary = await postRunner.discardScheduled();
      await sendWhatsAppMessage(senderPhone, `🗑 ${summary}`);
    }
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err.message);
  }
}

async function handleCoffeeUpdate(message, senderPhone) {
  try {
    console.log('Processing coffee update...');

    // Claude parses the free-form message into structured data
    const c = await parseCoffeeUpdate(message);

    // Write to the platform DB — the single source of truth.
    // (Maps the parser's nested origin shape onto the Coffee columns.)
    const saved = await platformClient.upsertCoffee({
      name: c.name || 'Café de Especialidad CBC',
      originCountry: c.origin?.country || 'México',
      originRegion: c.origin?.region || 'Por confirmar',
      originFarm: c.origin?.farm || undefined,
      variety: c.variety || undefined,
      process: c.process || undefined,
      roast: c.roast || undefined,
      tastingNotes: c.tastingNotes,
      story: c.story || undefined,
    });

    console.log(`✓ Coffee updated in DB: ${saved.name}`);

    await sendWhatsAppMessage(
      senderPhone,
      `✓ Café actualizado: *${saved.name}*\n` +
        `Origen: ${saved.originRegion}, ${saved.originCountry}\n` +
        `Variedad: ${saved.variety || '—'}\n` +
        `Proceso: ${saved.process || '—'}\n` +
        `Notas: ${(saved.tastingNotes || []).join(', ')}\n\n` +
        `El próximo contenido usará este café. 🎉`
    );
  } catch (err) {
    console.error('Error processing coffee update:', err.message);
    await sendWhatsAppMessage(
      senderPhone,
      '❌ No pude procesar el café. Intenta de nuevo con más detalles: nombre, origen, variedad, proceso y notas de cata.'
    );
  }
}

module.exports = { verifyWebhook, handleWebhook };
