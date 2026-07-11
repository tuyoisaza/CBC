/**
 * In-memory schedule state, seeded from config/schedule.json and overridden
 * by the platform DB at boot / on /config/schedule pushes.
 * Lives in its own module so scheduler.js and content-types can both read it
 * without a circular require.
 */
const fallback = require('../config/schedule.json');

const state = {
  timezone: fallback.timezone || 'America/Mexico_City',
  posts: { ...fallback.posts },
  seasons: [...(fallback.seasons || [])],
};

/** Merge a posts map (from the platform DB) over the file defaults. */
function setPosts(posts) {
  if (!posts || typeof posts !== 'object') return;
  for (const [key, cfg] of Object.entries(posts)) {
    if (cfg && typeof cfg === 'object' && typeof cfg.cron === 'string') {
      state.posts[key] = { ...state.posts[key], ...cfg };
    }
  }
}

function getPosts() {
  return state.posts;
}

function getSeasons() {
  return state.seasons;
}

function getTimezone() {
  return state.timezone;
}

module.exports = { setPosts, getPosts, getSeasons, getTimezone };
