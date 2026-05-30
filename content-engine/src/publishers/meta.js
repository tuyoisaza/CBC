const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'https://graph.facebook.com/v21.0';

// ─── Instagram ────────────────────────────────────────────────

async function publishToInstagram(imagePath, caption) {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const token = process.env.META_ACCESS_TOKEN;

  // Step 1: Upload image and create media container
  const imageUrl = await uploadImageToFacebook(imagePath);

  const containerRes = await axios.post(
    `${BASE_URL}/${accountId}/media`,
    {
      image_url: imageUrl,
      caption,
      access_token: token
    }
  );

  const containerId = containerRes.data.id;

  // Step 2: Publish the container
  const publishRes = await axios.post(
    `${BASE_URL}/${accountId}/media_publish`,
    {
      creation_id: containerId,
      access_token: token
    }
  );

  console.log(`✓ Instagram published: ${publishRes.data.id}`);
  return publishRes.data.id;
}

// ─── Facebook ─────────────────────────────────────────────────

async function publishToFacebook(imagePath, caption) {
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  const token = process.env.META_ACCESS_TOKEN;

  const form = new FormData();
  form.append('source', fs.createReadStream(imagePath));
  form.append('caption', caption);
  form.append('access_token', token);

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

async function uploadImageToFacebook(imagePath) {
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  const token = process.env.META_ACCESS_TOKEN;

  const form = new FormData();
  form.append('source', fs.createReadStream(imagePath));
  form.append('published', 'false'); // upload without publishing
  form.append('access_token', token);

  const res = await axios.post(
    `${BASE_URL}/${pageId}/photos`,
    form,
    { headers: form.getHeaders() }
  );

  // Get the hosted image URL
  const photoId = res.data.id;
  const photoRes = await axios.get(`${BASE_URL}/${photoId}`, {
    params: { fields: 'images', access_token: token }
  });

  return photoRes.data.images[0].source;
}

module.exports = { publishToInstagram, publishToFacebook };
