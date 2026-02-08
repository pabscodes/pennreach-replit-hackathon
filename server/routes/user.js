const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.put('/profile', async (req, res) => {
  try {
    const { name, firstName, lastName, preferredName, school, background, interests, emailSignature, resumeText } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferredName !== undefined) updateData.preferredName = preferredName;
    if (school !== undefined) updateData.school = school;
    if (background !== undefined) updateData.background = background;
    if (interests !== undefined) updateData.interests = interests;
    if (emailSignature !== undefined) updateData.emailSignature = emailSignature;
    if (resumeText !== undefined) updateData.resumeText = resumeText;

    if (firstName !== undefined || lastName !== undefined) {
      const fn = firstName !== undefined ? firstName : undefined;
      const ln = lastName !== undefined ? lastName : undefined;
      if (fn !== undefined || ln !== undefined) {
        const existingUser = await prisma.user.findUnique({ where: { id: req.userId } });
        const finalFirst = fn !== undefined ? fn : (existingUser.firstName || '');
        const finalLast = ln !== undefined ? ln : (existingUser.lastName || '');
        updateData.name = `${finalFirst} ${finalLast}`.trim();
      }
    } else if (name !== undefined) {
      updateData.name = name;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
    });

    const { passwordHash: _, hunterApiKey: _h, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
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

    const { passwordHash: _, hunterApiKey: _h, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
});

module.exports = router;
