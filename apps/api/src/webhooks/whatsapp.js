const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseCoffeeUpdate } = require('../generators/copy');

const COFFEE_CONFIG_PATH = path.join(__dirname, '../../config/coffee.json');
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
// Only messages from Lorena's number trigger updates
const LORENA_PHONE = process.env.LORENA_PHONE;

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

// Incoming message handler
async function handleWebhook(req, res) {
  res.sendStatus(200); // always ack immediately

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];

  if (!message || message.type !== 'text') return;

  const senderPhone = message.from;
  const text = message.text.body.trim();

  // Only process messages from Lorena
  if (senderPhone !== LORENA_PHONE) return;

  console.log(`WhatsApp message from Lorena: ${text}`);

  // Check if this is a coffee update
  const isCoffeeUpdate = text.toLowerCase().includes('café nuevo') ||
    text.toLowerCase().includes('cafe nuevo') ||
    text.toLowerCase().includes('nuevo café') ||
    text.toLowerCase().includes('nuevo cafe') ||
    text.toLowerCase().includes('new coffee');

  if (isCoffeeUpdate) {
    await handleCoffeeUpdate(text, senderPhone);
  }
}

async function handleCoffeeUpdate(message, senderPhone) {
  try {
    console.log('Processing coffee update...');

    // Use Claude to parse the free-form message into structured data
    const coffeeData = await parseCoffeeUpdate(message);

    // Load existing config
    const config = JSON.parse(fs.readFileSync(COFFEE_CONFIG_PATH, 'utf8'));

    // Update with new coffee data
    config.current = coffeeData;
    config._lastUpdated = new Date().toISOString().split('T')[0];

    // Save back to file
    fs.writeFileSync(COFFEE_CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log(`✓ Coffee config updated: ${coffeeData.name}`);

    // Send confirmation back to Lorena via WhatsApp
    await sendWhatsAppMessage(senderPhone,
      `✓ Café actualizado: *${coffeeData.name}*\n` +
      `Origen: ${coffeeData.origin?.region}, ${coffeeData.origin?.country}\n` +
      `Variedad: ${coffeeData.variety}\n` +
      `Proceso: ${coffeeData.process}\n` +
      `Notas: ${coffeeData.tastingNotes?.join(', ')}\n\n` +
      `El próximo contenido usará este café. 🎉`
    );

  } catch (err) {
    console.error('Error processing coffee update:', err.message);
    await sendWhatsAppMessage(senderPhone,
      '❌ No pude procesar el café. Intenta de nuevo con más detalles: nombre, origen, variedad, proceso y notas de cata.'
    );
  }
}

async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${WA_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    },
    { headers: { Authorization: `Bearer ${WA_TOKEN}` } }
  );
}

module.exports = { verifyWebhook, handleWebhook };
