const { runPost, preview } = require('../post-runner');
const scheduleState = require('../schedule-state');

function getActiveSeason() {
  const today = new Date();
  const mmdd =
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0');

  for (const season of scheduleState.getSeasons()) {
    if (!season.active) continue;
    // Simple range check — campaign runs from start date to peak date
    if (mmdd >= season.campaignStartDate && mmdd <= season.peakDate) {
      return season;
    }
  }
  return null;
}

/**
 * Daily 8am check. Only posts when a season window is active, and at most
 * once per `minDaysBetween` days (default 3) — the old behavior posted every
 * single day of a 60-day campaign window, which is spam, not marketing.
 */
async function run({ requireApproval = true } = {}) {
  const season = getActiveSeason();
  if (!season) {
    console.log('No active season today, skipping seasonal post');
    return { skipped: true };
  }

  const minDays = season.minDaysBetween ?? 3;
  const results = {};
  for (const platform of season.platforms) {
    results[platform] = await runPost({
      contentType: 'seasonal',
      promptKey: 'seasonal',
      platforms: [platform],
      data: { season, platform },
      requireApproval,
      windowHours: minDays * 24,
    });
  }
  return results;
}

function previewSeasonal() {
  const season = getActiveSeason() ||
    scheduleState.getSeasons()[0] || { name: 'Fin de año', platforms: ['instagram'] };
  return preview('seasonal', { season, platform: season.platforms?.[0] || 'instagram' });
}

module.exports = { run, preview: previewSeasonal, getActiveSeason };
