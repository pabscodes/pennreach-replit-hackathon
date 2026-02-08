const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const pdfParse = require('pdf-parse');
const { parseResume, parseResumeFromFile, generateBio } = require('../services/ai');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.put('/profile', async (req, res) => {
  try {
    const { name, firstName, lastName, preferredName, school, background, interests, emailSignature, resumeText, generatedBio, workExperience, education, skillsInterests, outreachPurposes, outreachContext } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferredName !== undefined) updateData.preferredName = preferredName;
    if (school !== undefined) updateData.school = school;
    if (background !== undefined) updateData.background = background;
    if (interests !== undefined) updateData.interests = interests;
    if (emailSignature !== undefined) updateData.emailSignature = emailSignature;
    if (resumeText !== undefined) updateData.resumeText = resumeText;
    if (generatedBio !== undefined) updateData.generatedBio = generatedBio;
    if (workExperience !== undefined) updateData.workExperience = workExperience;
    if (education !== undefined) updateData.education = education;
    if (skillsInterests !== undefined) updateData.skillsInterests = skillsInterests;
    if (outreachPurposes !== undefined) updateData.outreachPurposes = outreachPurposes;
    if (outreachContext !== undefined) updateData.outreachContext = outreachContext;

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

router.delete('/settings/hunter-key', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { hunterApiKey: null },
    });
    res.json({ message: 'Hunter.io API key deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

router.post('/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let parsed;
    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      const text = pdfData.text;
      await prisma.user.update({
        where: { id: req.userId },
        data: { resumeText: text },
      });
      parsed = await parseResume(text);
    } else {
      parsed = await parseResumeFromFile(req.file.buffer, req.file.mimetype);
    }

    res.json({ parsed });
  } catch (err) {
    console.error('Resume parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

router.post('/generate-bio', async (req, res) => {
  try {
    const { firstName, lastName, workExperience, education, skills, interests } = req.body;
    const result = await generateBio({ firstName, lastName, workExperience, education, skills, interests });
    res.json(result);
  } catch (err) {
    console.error('Bio generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate bio' });
  }
});

module.exports = router;
