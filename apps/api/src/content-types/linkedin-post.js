const { runPost, preview } = require('../post-runner');

/**
 * LinkedIn is Lorena's professional face — approval-gated by default.
 * Pass requireApproval: false via schedule config to make it fully automatic.
 */
async function run(platforms = ['linkedin'], { requireApproval = true } = {}) {
  return runPost({
    contentType: 'linkedin-post',
    promptKey: 'linkedinPost',
    platforms: ['linkedin'],
    requireApproval,
  });
}

module.exports = { run, preview: () => preview('linkedinPost') };
