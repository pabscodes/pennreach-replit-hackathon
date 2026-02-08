const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseProfile, parseProfileFromFile, generateDraft } = require('../services/ai');
const { findEmail } = require('../services/hunter');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    let parsed;
    let rawText = null;

    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(req.file.buffer);
        rawText = pdfData.text;
        parsed = await parseProfile(rawText);
      } else {
        parsed = await parseProfileFromFile(req.file.buffer, req.file.mimetype);
      }
    } else if (req.body.text) {
      rawText = req.body.text;
      parsed = await parseProfile(rawText);
    } else {
      return res.status(400).json({ error: 'Please provide a file or text to parse' });
    }

    const contact = await prisma.contact.create({
      data: {
        userId: req.userId,
        firstName: parsed.firstName || null,
        lastName: parsed.lastName || null,
        company: parsed.company || null,
        role: parsed.role || null,
        linkedinUrl: parsed.linkedinUrl || null,
        profileSummary: parsed.profileSummary || null,
        rawProfileText: rawText,
        hooks: parsed.hooks ? JSON.stringify(parsed.hooks) : null,
      },
    });

    res.status(201).json({ contact });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to parse profile' });
  }
});

router.get('/', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      include: {
        _count: {
          select: { drafts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
      include: {
        drafts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const { firstName, lastName, company, role, linkedinUrl, workEmail, personalEmail, profileSummary, hooks, outreachGoal, goalDetail } = req.body;

    const contact = await prisma.contact.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(company !== undefined && { company }),
        ...(role !== undefined && { role }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(workEmail !== undefined && { workEmail }),
        ...(personalEmail !== undefined && { personalEmail }),
        ...(profileSummary !== undefined && { profileSummary }),
        ...(hooks !== undefined && { hooks: typeof hooks === 'string' ? hooks : JSON.stringify(hooks) }),
        ...(outreachGoal !== undefined && { outreachGoal }),
        ...(goalDetail !== undefined && { goalDetail }),
      },
    });

    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await prisma.contact.delete({ where: { id: parseInt(req.params.id) } });

    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const existing = await prisma.contact.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const contact = await prisma.contact.update({
      where: { id: parseInt(req.params.id) },
      data: { status, lastActionAt: new Date() },
    });

    res.json({ contact });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/:id/find-email', async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const result = await findEmail(contact.firstName, contact.lastName, contact.company, user.hunterApiKey);

    if (result.email) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          workEmail: result.email,
          emailStatus: 'found',
          emailConfidence: result.confidence,
          lastActionAt: new Date(),
        },
      });
    } else {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          emailStatus: 'not_found',
          lastActionAt: new Date(),
        },
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to find email' });
  }
});

router.post('/:id/draft', async (req, res) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
      include: { drafts: true },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const { outreachGoal, goalDetail, availability } = req.body;

    if (outreachGoal) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { outreachGoal, goalDetail },
      });
    }

    const result = await generateDraft(user, contact, outreachGoal || contact.outreachGoal, goalDetail || contact.goalDetail, availability);

    const version = contact.drafts.length + 1;
    const draft = await prisma.emailDraft.create({
      data: {
        contactId: contact.id,
        subject: result.subject,
        body: result.body,
        availabilityText: availability || null,
        version,
      },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        status: contact.status === 'new' || contact.status === 'email_found' ? 'draft_created' : contact.status,
        lastActionAt: new Date(),
      },
    });

    res.status(201).json({ draft });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate draft' });
  }
});

module.exports = router;
