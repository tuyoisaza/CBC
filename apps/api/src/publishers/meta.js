const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { getMetaCreds } = require('../social-creds');

const BASE_URL = 'https://graph.facebook.com/v21.0';

// Credentials resolve DB-first (what Lorena authorized in Admin → Marketing →
// Conexiones), falling back to env vars. See social-creds.js.

// ─── Instagram ────────────────────────────────────────────────

async function publishToInstagram(imagePath, caption) {
  const { pageId, pageToken, igAccountId } = await getMetaCreds();
  if (!igAccountId) {
    throw new Error(
      'La página de Facebook no tiene cuenta de Instagram Business vinculada.'
    );
  }

  // Step 1: Upload image and create media container
  const imageUrl = await uploadImageToFacebook(imagePath, pageId, pageToken);

  const containerRes = await axios.post(
    `${BASE_URL}/${igAccountId}/media`,
    {
      image_url: imageUrl,
      caption,
      access_token: pageToken
    }
  );

  const containerId = containerRes.data.id;

  // Step 2: Publish the container
  const publishRes = await axios.post(
    `${BASE_URL}/${igAccountId}/media_publish`,
    {
      creation_id: containerId,
      access_token: pageToken
    }
  );

  console.log(`✓ Instagram published: ${publishRes.data.id}`);
  return publishRes.data.id;
}

// ─── Facebook ─────────────────────────────────────────────────

async function publishToFacebook(imagePath, caption) {
  const { pageId, pageToken } = await getMetaCreds();

  const form = new FormData();
  form.append('source', fs.createReadStream(imagePath));
  form.append('caption', caption);
  form.append('access_token', pageToken);

  const res = await axios.post(
    `${BASE_URL}/${pageId}/photos`,
    form,
    { headers: form.getHeaders() }
  );

  console.log(`✓ Facebook published: ${res.data.post_id}`);
  return res.data.post_id;
}

// ─── Shared image host ────────────────────────────────────────
// Instagram requires a public URL for the image.
// We upload to Facebook first (which gives us a hosted URL) then use it for IG.

async function uploadImageToFacebook(imagePath, pageId, pageToken) {
  const form = new FormData();
  form.append('source', fs.createReadStream(imagePath));
  form.append('published', 'false'); // upload without publishing
  form.append('access_token', pageToken);

  const res = await axios.post(
    `${BASE_URL}/${pageId}/photos`,
    form,
    { headers: form.getHeaders() }
  );

  // Get the hosted image URL
  const photoId = res.data.id;
  const photoRes = await axios.get(`${BASE_URL}/${photoId}`, {
    params: { fields: 'images', access_token: pageToken }
  });

  return photoRes.data.images[0].source;
}

module.exports = { publishToInstagram, publishToFacebook };
