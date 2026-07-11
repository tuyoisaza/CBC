const { runPost, preview } = require('../post-runner');

async function run(platforms = ['instagram', 'facebook']) {
  return runPost({
    contentType: 'coffee-story',
    promptKey: 'coffeeStory',
    platforms,
  });
}

module.exports = { run, preview: () => preview('coffeeStory') };
