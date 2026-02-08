const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/availability', (req, res) => {
  res.json({
    message: 'Calendar integration requires Google OAuth to be connected. Please connect your Google account in Settings to enable automatic availability detection.',
    configured: false,
    availability: null,
  });
});

module.exports = router;
