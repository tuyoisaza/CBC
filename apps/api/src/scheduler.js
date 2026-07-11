/**
 * Cron scheduler — DB-driven.
 * Schedule loads from the platform (Setting.schedule.*) at boot, falls back to
 * config/schedule.json if the platform is unreachable, and re-registers live
 * when the admin pushes /config/schedule. All jobs run in CDMX time.
 *
 * NOTE: this process must run as a SINGLE replica — in-process cron on N
 * replicas fires every job N times. The idempotency check in post-runner
 * would catch it, but don't rely on that.
 */
const cron = require('node-cron');
const platform = require('./platform');
const scheduleState = require('./schedule-state');

const productPost = require('./content-types/product-post');
const coffeeStory = require('./content-types/coffee-story');
const linkedinPost = require('./content-types/linkedin-post');
const socialProof = require('./content-types/social-proof');
const seasonal = require('./content-types/seasonal');

const RUNNERS = {
  productPost: (cfg) => productPost.run(cfg.platforms),
  coffeeStory: (cfg) => coffeeStory.run(cfg.platforms),
  linkedinPost: (cfg) => linkedinPost.run(cfg.platforms, { requireApproval: cfg.requireApproval !== false }),
  socialProof: (cfg) => socialProof.run(cfg.platforms),
};

let jobs = [];
let seasonalJob = null;

async function start() {
  try {
    const fromDb = await platform.getSchedule();
    scheduleState.setPosts(fromDb);
    console.log('✓ Schedule loaded from platform DB');
  } catch (err) {
    console.warn(`Schedule load from platform failed (${err.message}) — using file defaults`);
  }
  registerJobs();

  // Seasonal check — daily at 8am CDMX; only posts inside a campaign window,
  // rate-limited by season.minDaysBetween (see content-types/seasonal.js)
  if (!seasonalJob) {
    seasonalJob = cron.schedule(
      '0 8 * * *',
      async () => {
        console.log(`[${new Date().toISOString()}] Cron: seasonal check`);
        try {
          await seasonal.run({ requireApproval: true });
        } catch (e) {
          console.error('Seasonal post failed:', e.message);
        }
      },
      { timezone: scheduleState.getTimezone() }
    );
    console.log('✓ Scheduled: seasonal check (daily 8am)');
  }
}

/** (Re-)register all post jobs from current state. Called at boot and on /config/schedule. */
function registerJobs() {
  jobs.forEach((j) => j.stop());
  jobs = [];

  const tz = scheduleState.getTimezone();
  for (const [key, cfg] of Object.entries(scheduleState.getPosts())) {
    if (!cfg.active) continue;
    const runner = RUNNERS[key];
    if (!runner) {
      console.warn(`No runner for schedule key "${key}" — skipping`);
      continue;
    }
    if (!cron.validate(cfg.cron)) {
      console.warn(`Invalid cron "${cfg.cron}" for "${key}" — skipping`);
      continue;
    }
    const job = cron.schedule(
      cfg.cron,
      async () => {
        console.log(`[${new Date().toISOString()}] Cron: ${key}`);
        try {
          await runner(cfg);
        } catch (e) {
          console.error(`${key} failed:`, e.message);
        }
      },
      { timezone: tz }
    );
    jobs.push(job);
    console.log(`✓ Scheduled: ${key} (${cfg.cron} ${tz})`);
  }
}

/** Live reschedule from the admin (POST /config/schedule). */
function reschedule(posts) {
  scheduleState.setPosts(posts);
  registerJobs();
  console.log('↻ Schedule re-registered from admin push');
}

/** Upcoming posts summary for /health. */
function nextPosts() {
  return Object.entries(scheduleState.getPosts())
    .filter(([, cfg]) => cfg.active)
    .map(([type, cfg]) => ({ type, at: cfg.label || cfg.cron }));
}

module.exports = { start, reschedule, nextPosts };
