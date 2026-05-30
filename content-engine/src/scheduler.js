const cron = require('node-cron');
const schedule = require('../config/schedule.json');

const productPost  = require('./content-types/product-post');
const coffeeStory  = require('./content-types/coffee-story');
const linkedinPost = require('./content-types/linkedin-post');
const seasonal     = require('./content-types/seasonal');

function start() {
  const tz = schedule.timezone;

  // Weekly product post — Monday 10am
  if (schedule.posts.productPost.active) {
    cron.schedule(schedule.posts.productPost.cron, async () => {
      console.log(`[${new Date().toISOString()}] Cron: product post`);
      try { await productPost.run(schedule.posts.productPost.platforms); }
      catch (e) { console.error('Product post failed:', e.message); }
    }, { timezone: tz });
    console.log('✓ Scheduled: product post (Monday 10am)');
  }

  // Weekly coffee story — Wednesday 10am
  if (schedule.posts.coffeeStory.active) {
    cron.schedule(schedule.posts.coffeeStory.cron, async () => {
      console.log(`[${new Date().toISOString()}] Cron: coffee story`);
      try { await coffeeStory.run(schedule.posts.coffeeStory.platforms); }
      catch (e) { console.error('Coffee story failed:', e.message); }
    }, { timezone: tz });
    console.log('✓ Scheduled: coffee story (Wednesday 10am)');
  }

  // Bi-weekly LinkedIn — 1st and 15th at 9am
  if (schedule.posts.linkedinPost.active) {
    cron.schedule(schedule.posts.linkedinPost.cron, async () => {
      console.log(`[${new Date().toISOString()}] Cron: LinkedIn post`);
      try { await linkedinPost.run(); }
      catch (e) { console.error('LinkedIn post failed:', e.message); }
    }, { timezone: tz });
    console.log('✓ Scheduled: LinkedIn post (1st and 15th at 9am)');
  }

  // Seasonal check — daily at 8am, runs content if a season is active
  cron.schedule('0 8 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Cron: seasonal check`);
    try { await seasonal.run(); }
    catch (e) { console.error('Seasonal post failed:', e.message); }
  }, { timezone: tz });
  console.log('✓ Scheduled: seasonal check (daily 8am)');

  console.log('\n🚀 CBC Content Engine scheduler running\n');
}

module.exports = { start };
