const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.put('/profile', async (req, res) => {
  try {
    const { name, school, background, interests, emailSignature, resumeText } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(school !== undefined && { school }),
        ...(background !== undefined && { background }),
        ...(interests !== undefined && { interests }),
        ...(emailSignature !== undefined && { emailSignature }),
        ...(resumeText !== undefined && { resumeText }),
      },
    });

    const { passwordHash: _, hunterApiKey: _h, anthropicApiKey: _a, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { hunterApiKey } = req.body;

    const data = {};
    if (hunterApiKey !== undefined) data.hunterApiKey = hunterApiKey;

    await prisma.user.update({
      where: { id: req.userId },
      data,
    });

    res.json({
      message: 'Settings updated',
      hasHunterKey: !!hunterApiKey,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.put('/onboarding', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { onboardingComplete: true },
    });

    const { passwordHash: _, hunterApiKey: _h, anthropicApiKey: _a, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
});

module.exports = router;
