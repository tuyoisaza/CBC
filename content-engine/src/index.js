require('dotenv').config();
const express = require('express');
const { verifyWebhook, handleWebhook } = require('./webhooks/whatsapp');
const scheduler = require('./scheduler');

const app = express();
app.use(express.json());

// ─── WhatsApp webhook ─────────────────────────────────────────
// Meta calls GET to verify, POST to deliver messages
app.get('/webhook/whatsapp', verifyWebhook);
app.post('/webhook/whatsapp', handleWebhook);

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  const coffee = require('../config/coffee.json');
  res.json({
    status: 'running',
    currentCoffee: coffee.current?.name || 'not set',
    lastUpdated: coffee._lastUpdated
  });
});

// ─── Manual trigger (for testing) ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const productPost  = require('./content-types/product-post');
  const coffeeStory  = require('./content-types/coffee-story');
  const linkedinPost = require('./content-types/linkedin-post');

  app.post('/test/product-post',  async (req, res) => { try { res.json(await productPost.run());  } catch(e) { res.status(500).json({ error: e.message }); }});
  app.post('/test/coffee-story',  async (req, res) => { try { res.json(await coffeeStory.run());  } catch(e) { res.status(500).json({ error: e.message }); }});
  app.post('/test/linkedin-post', async (req, res) => { try { res.json(await linkedinPost.run()); } catch(e) { res.status(500).json({ error: e.message }); }});
}

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CBC Content Engine running on port ${PORT}`);
  scheduler.start();
});
