const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { isConfigured, getAuthUrl, getTokensFromCode, getAuthenticatedClient, verifySignedState } = require('../services/google');
const { google } = require('googleapis');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/callback', async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(400).send('Google OAuth not configured');
    }

    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    if (!state) {
      return res.status(400).send('Missing state parameter');
    }

    const verified = verifySignedState(state);
    if (!verified || !verified.userId) {
      return res.status(400).send('Invalid or expired state parameter');
    }

    const userId = verified.userId;

    const tokens = await getTokensFromCode(code);

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    res.send(`
      <html>
        <body>
          <script>
            window.opener && window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
            window.close();
          </script>
          <p>Google account connected successfully! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`
      <html>
        <body>
          <script>
            window.opener && window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${err.message}' }, '*');
            window.close();
          </script>
          <p>Failed to connect Google account. You can close this window.</p>
        </body>
      </html>
    `);
  }
});

router.use(auth);

router.get('/status', async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.json({ configured: false, connected: false });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const connected = !!(user && user.googleAccessToken);

    let email = null;
    if (connected) {
      try {
        const authClient = await getAuthenticatedClient(req.userId);
        if (authClient) {
          const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
          const userInfo = await oauth2.userinfo.get();
          email = userInfo.data.email;
        }
      } catch (e) {
        // ignore
      }
    }

    res.json({ configured: true, connected, email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check Gmail status' });
  }
});

router.get('/auth-url', (req, res) => {
  if (!isConfigured()) {
    return res.json({
      configured: false,
      message: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to environment variables.',
    });
  }

  const url = getAuthUrl(req.userId);
  res.json({ configured: true, url });
});

router.post('/disconnect', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
});

router.post('/create-draft', async (req, res) => {
  try {
    const authClient = await getAuthenticatedClient(req.userId);
    if (!authClient) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect your Google account in Settings.' });
    }

    const { to, subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const messageParts = [
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
    ];
    if (to) messageParts.splice(0, 0, `To: ${to}`);
    messageParts.push('', body);

    const raw = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const draft = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw },
      },
    });

    res.json({ success: true, draftId: draft.data.id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create Gmail draft' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const authClient = await getAuthenticatedClient(req.userId);
    if (!authClient) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect your Google account in Settings.' });
    }

    const { to, subject, body, draftId } = req.body;
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    if (draftId) {
      const result = await gmail.users.drafts.send({
        userId: 'me',
        requestBody: { id: draftId },
      });
      return res.json({ success: true, messageId: result.data.id });
    }

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required for direct send' });
    }

    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ];

    const raw = Buffer.from(messageParts.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    res.json({ success: true, messageId: result.data.id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

module.exports = router;
