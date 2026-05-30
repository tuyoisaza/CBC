const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://api.linkedin.com/v2';

async function publishToLinkedIn(imagePath, caption) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  // Use person URN for Lorena's personal profile, or org URN for company page
  const authorUrn = process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_PERSON_URN;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0'
  };

  // Step 1: Register image upload
  const registerRes = await axios.post(
    `${BASE_URL}/assets?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: authorUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }]
      }
    },
    { headers }
  );

  const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = registerRes.data.value.asset;

  // Step 2: Upload image binary
  const imageBuffer = fs.readFileSync(imagePath);
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream'
    }
  });

  // Step 3: Create post with image
  const postRes = await axios.post(
    `${BASE_URL}/ugcPosts`,
    {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: 'IMAGE',
          media: [{
            status: 'READY',
            description: { text: 'Coffee Bunn Café' },
            media: assetUrn,
            title: { text: 'Coffee Bunn Café' }
          }]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    },
    { headers }
  );

  console.log(`✓ LinkedIn published: ${postRes.data.id}`);
  return postRes.data.id;
}

module.exports = { publishToLinkedIn };
