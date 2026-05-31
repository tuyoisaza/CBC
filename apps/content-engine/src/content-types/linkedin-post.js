const { generateCaption, generateImagePrompt } = require('../generators/copy');
const { generateImage, cleanupImage } = require('../generators/image');
const { publishToLinkedIn } = require('../publishers/linkedin');

async function run() {
  console.log('▶ Running LinkedIn post...');
  let imagePath = null;

  try {
    const coffee = require('../../config/coffee.json').current;

    const [caption, imagePromptRaw] = await Promise.all([
      generateCaption('linkedinPost', { coffee }),
      generateImagePrompt('linkedinPost', { coffee })
    ]);

    imagePath = await generateImage(imagePromptRaw);
    const postId = await publishToLinkedIn(imagePath, caption);

    console.log('✓ LinkedIn post published', postId);
    return postId;

  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
}

module.exports = { run };
