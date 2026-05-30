const { generateCaption, generateImagePrompt } = require('../generators/copy');
const { generateImage, cleanupImage } = require('../generators/image');
const { publishToInstagram, publishToFacebook } = require('../publishers/meta');
const { publishToLinkedIn } = require('../publishers/linkedin');
const schedule = require('../../config/schedule.json');

function getActiveSeason() {
  const today = new Date();
  const mmdd = String(today.getMonth() + 1).padStart(2, '0') + '-' +
               String(today.getDate()).padStart(2, '0');

  for (const season of schedule.seasons) {
    if (!season.active) continue;
    // Simple range check — campaign runs from start date to peak date
    if (mmdd >= season.campaignStartDate && mmdd <= season.peakDate) {
      return season;
    }
  }
  return null;
}

async function run() {
  const season = getActiveSeason();
  if (!season) {
    console.log('No active season today, skipping seasonal post');
    return;
  }

  console.log(`▶ Running seasonal post for: ${season.name}`);
  let imagePath = null;

  try {
    const coffee = require('../../config/coffee.json').current;

    for (const platform of season.platforms) {
      const [caption, imagePromptRaw] = await Promise.all([
        generateCaption('seasonal', { season, coffee, platform }),
        generateImagePrompt('seasonal', { season, coffee })
      ]);

      imagePath = await generateImage(imagePromptRaw);

      if (platform === 'instagram') await publishToInstagram(imagePath, caption);
      if (platform === 'facebook') await publishToFacebook(imagePath, caption);
      if (platform === 'linkedin') await publishToLinkedIn(imagePath, caption);

      if (imagePath) { cleanupImage(imagePath); imagePath = null; }
    }

    console.log(`✓ Seasonal posts published for ${season.name}`);

  } finally {
    if (imagePath) cleanupImage(imagePath);
  }
}

module.exports = { run, getActiveSeason };
