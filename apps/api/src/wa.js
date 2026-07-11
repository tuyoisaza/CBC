/** Outbound WhatsApp (Meta Cloud API). */
const axios = require('axios');

async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text, preview_url: true },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
}

/** Notify Lorena; never throws (alerts must not break the pipeline). */
async function notifyLorena(text) {
  try {
    if (!process.env.LORENA_PHONE) return;
    await sendWhatsAppMessage(process.env.LORENA_PHONE, text);
  } catch (err) {
    console.error('Lorena WhatsApp alert failed:', err.message);
  }
}

module.exports = { sendWhatsAppMessage, notifyLorena };
