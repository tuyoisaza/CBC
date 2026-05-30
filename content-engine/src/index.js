require('dotenv').config();
const express = require('express');
const scheduler = require('./scheduler');
const { generateCaption, generateImagePrompt } = require('./generators/copy');
const { generateImage, cleanupImage } = require('./generators/image');
const { publishToInstagram, publishToFacebook } = require('./publishers/meta');
const { publishToLinkedIn } = require('./publishers/linkedin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());

const COFFEE_CONFIG_PATH = path.join(__dirname, '../config/coffee.json');

// ─── Token middleware ─────────────────────────────────────────────────────────
function requireToken(req, res, next) {
  const token = req.headers['x-engine-token'];
  if (token !== process.env.ENGINE_SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const coffee = JSON.parse(fs.readFileSync(COFFEE_CONFIG_PATH, 'utf8'));
  const schedConfig = require('../config/schedule.json');

  // Build next post times from schedule
  const nextPosts = Object.entries(schedConfig.posts || {})
    .filter(([, s]) => s.active)
    .map(([type, s]) => ({ type, cron: s.cron, description: s.description }));

  res.json({
    status: 'running',
    currentCoffee: coffee.current?.name || 'not set',
    lastUpdated: coffee._lastUpdated,
    nextPosts,
  });
});

// ─── Config update from platform ─────────────────────────────────────────────

app.post('/config/coffee', requireToken, (req, res) => {
  try {
    const incoming = req.body;
    const config = JSON.parse(fs.readFileSync(COFFEE_CONFIG_PATH, 'utf8'));

    // Map platform Coffee model fields to engine config shape
    config.current = {
      name:         incoming.name,
      origin: {
        country: incoming.originCountry,
        region:  incoming.originRegion,
        farm:    incoming.originFarm || null,
      },
      variety:      incoming.variety || null,
      process:      incoming.process || null,
      roast:        incoming.roast || null,
      tastingNotes: incoming.tastingNotes || [],
      story:        incoming.story || null,
      brewingMethods: ['prensa francesa', 'moka'],
    };
    config._lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(COFFEE_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✓ Coffee config updated via platform: ${incoming.name}`);
    res.json({ ok: true, coffee: config.current });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/config/schedule', requireToken, (req, res) => {
  try {
    const incoming = req.body;
    const schedPath = path.join(__dirname, '../config/schedule.json');
    const current = JSON.parse(fs.readFileSync(schedPath, 'utf8'));

    // Merge incoming schedule settings
    for (const [key, value] of Object.entries(incoming)) {
      if (current.posts[key]) {
        current.posts[key] = { ...current.posts[key], ...value };
      }
    }

    fs.writeFileSync(schedPath, JSON.stringify(current, null, 2));
    console.log('✓ Schedule config updated via platform');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview (generate but don't publish) ────────────────────────────────────

app.post('/preview', requireToken, async (req, res) => {
  const { type = 'product-post' } = req.body;
  let imagePath = null;

  try {
    const coffee = JSON.parse(fs.readFileSync(COFFEE_CONFIG_PATH, 'utf8')).current;

    const [caption, imagePromptRaw] = await Promise.all([
      generateCaption(type.replace('-', '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
        .replace('product_post', 'productPost')
        .replace('coffee_story', 'coffeeStory')
        .replace('linkedin_post', 'linkedinPost'),
        { coffee }),
      generateImagePrompt(type, { coffee }),
    ]);

    imagePath = await generateImage(imagePromptRaw);

    // Upload image to platform R2 via platform API
    const imageUrl = await uploadImageToPlatform(imagePath);

    res.json({ caption, imageUrl, imagePrompt: imagePromptRaw });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
});

// ─── Manual trigger ───────────────────────────────────────────────────────────

app.post('/trigger/:type', requireToken, async (req, res) => {
  const { type } = req.params;
  const contentTypes = {
    'product-post':  require('./content-types/product-post'),
    'coffee-story':  require('./content-types/coffee-story'),
    'linkedin-post': require('./content-types/linkedin-post'),
    'seasonal':      require('./content-types/seasonal'),
  };

  const handler = contentTypes[type];
  if (!handler) return res.status(404).json({ error: 'Unknown post type' });

  try {
    const result = await handler.run();
    // Save post record to platform
    await savePostToPlatform({ type, result });
    res.json({ success: true, result });
  } catch (err) {
    console.error(`Trigger ${type} error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadImageToPlatform(imagePath) {
  const PLATFORM_URL = process.env.PLATFORM_URL;
  if (!PLATFORM_URL) return null;

  try {
    // Get presigned upload URL
    const filename = path.basename(imagePath);
    const upRes = await axios.get(`${PLATFORM_URL}/api/upload?filename=${filename}&type=image/jpeg`, {
      headers: { 'x-engine-token': process.env.ENGINE_SECRET_TOKEN },
    });
    const { uploadUrl, publicUrl } = upRes.data;

    // Upload binary
    const buffer = fs.readFileSync(imagePath);
    await axios.put(uploadUrl, buffer, { headers: { 'Content-Type': 'image/jpeg' } });

    return publicUrl;
  } catch (err) {
    console.warn('Image upload to platform failed:', err.message);
    return null;
  }
}

async function savePostToPlatform({ type, result }) {
  const PLATFORM_URL = process.env.PLATFORM_URL;
  if (!PLATFORM_URL) return;

  try {
    const coffee = JSON.parse(fs.readFileSync(COFFEE_CONFIG_PATH, 'utf8')).current;
    await axios.post(`${PLATFORM_URL}/api/admin/posts`, {
      platform:      Object.keys(result || {})[0] || 'unknown',
      contentType:   type,
      caption:       result?.caption || '',
      imageUrl:      result?.imageUrl,
      status:        'published',
      platformPostId: result?.instagram || result?.facebook || result?.linkedin,
    }, {
      headers: { 'x-engine-token': process.env.ENGINE_SECRET_TOKEN },
    });
  } catch (err) {
    console.warn('Save post to platform failed:', err.message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CBC Content Engine running on port ${PORT}`);
  scheduler.start();
});
