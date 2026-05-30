const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const BRAND_STYLE_SUFFIX = `
Style: premium specialty coffee brand photography. Deep black background (#262626), warm yellow (#f7b84e) accent lighting.
Minimalist composition, studio lighting, shallow depth of field.
High-end product photography aesthetic. Dark and moody. No text, no watermarks, no logos.
Photorealistic, 4K quality.`;

async function generateImage(prompt) {
  const fullPrompt = prompt + BRAND_STYLE_SUFFIX;

  const response = await getClient().images.generate({
    model: 'dall-e-3',
    prompt: fullPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    style: 'natural'
  });

  const imageUrl = response.data[0].url;
  return await downloadImage(imageUrl);
}

async function downloadImage(url) {
  const tmpDir = path.join(__dirname, '../../tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filename = `post_${Date.now()}.jpg`;
  const filepath = path.join(tmpDir, filename);

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filepath, response.data);

  return filepath;
}

function cleanupImage(filepath) {
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}

module.exports = { generateImage, cleanupImage };
