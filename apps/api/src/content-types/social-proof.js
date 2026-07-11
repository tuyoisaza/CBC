const { runPost, preview } = require('../post-runner');

/**
 * Social proof / experience pillar (Pillar 3 — LA EXPERIENCIA).
 * The Post history UI already had a 'social-proof' label with no generator
 * behind it; this fills the highest-intent pillar and the 3rd weekly slot.
 */
async function run(platforms = ['instagram', 'facebook']) {
  return runPost({
    contentType: 'social-proof',
    promptKey: 'socialProof',
    platforms,
  });
}

module.exports = { run, preview: () => preview('socialProof') };
