const { generateCaption, generateImagePrompt } = require('../generators/copy');
const { generateImage, cleanupImage } = require('../generators/image');
const { publishToInstagram, publishToFacebook } = require('../publishers/meta');

async function run(platforms = ['instagram', 'facebook']) {
  console.log('▶ Running coffee story post...');
  let imagePath = null;

  try {
    const coffee = require('../../config/coffee.json').current;

    const [caption, imagePromptRaw] = await Promise.all([
      generateCaption('coffeeStory', { coffee }),
      generateImagePrompt('coffeeStory', { coffee })
    ]);

    imagePath = await generateImage(imagePromptRaw);

    const results = {};

    if (platforms.includes('instagram')) {
      results.instagram = await publishToInstagram(imagePath, caption);
    }
    if (platforms.includes('facebook')) {
      results.facebook = await publishToFacebook(imagePath, caption);
    }

    console.log('✓ Coffee story post published', results);
    return results;

  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
}

module.exports = { run };
