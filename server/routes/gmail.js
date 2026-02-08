const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/auth-url', (req, res) => {
  res.json({
    message: 'Google OAuth is not yet configured. To enable Gmail integration, set up a Google Cloud project with OAuth credentials and add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to your environment variables.',
    configured: false,
  });
});

router.get('/callback', (req, res) => {
  res.json({
    message: 'Google OAuth callback endpoint. OAuth is not yet configured.',
    configured: false,
  });
});

router.post('/create-draft', (req, res) => {
  res.json({
    message: 'Gmail draft creation requires Google OAuth to be configured. Please connect your Google account in Settings first.',
    configured: false,
  });
});

module.exports = router;
