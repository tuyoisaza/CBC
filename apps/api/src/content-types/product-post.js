const { runPost, preview } = require('../post-runner');

async function run(platforms = ['instagram', 'facebook']) {
  return runPost({
    contentType: 'product-post',
    promptKey: 'productPost',
    platforms,
  });
}

module.exports = { run, preview: () => preview('productPost') };
