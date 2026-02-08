const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.readonly',
];

function isConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getSigningSecret() {
  return process.env.JWT_SECRET || 'default-dev-secret';
}

function createSignedState(userId) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ userId, nonce, ts: Date.now() });
  const hmac = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

function verifySignedState(state) {
  try {
    const { payload, hmac } = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const expectedHmac = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }
    const parsed = JSON.parse(payload);
    const age = Date.now() - parsed.ts;
    if (age > 10 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();
  const state = createSignedState(userId);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
}

async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function getAuthenticatedClient(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.googleAccessToken) {
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : undefined,
  });

  if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        },
      });
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
        },
      });
      return null;
    }
  }

  return oauth2Client;
}

module.exports = {
  isConfigured,
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  getAuthenticatedClient,
  verifySignedState,
  SCOPES,
};
