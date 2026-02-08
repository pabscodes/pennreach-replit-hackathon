const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.put('/:id', async (req, res) => {
  try {
    const draft = await prisma.emailDraft.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        contact: { select: { userId: true } },
      },
    });

    if (!draft || draft.contact.userId !== req.userId) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const { subject, body } = req.body;

    const updated = await prisma.emailDraft.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(subject !== undefined && { subject }),
        ...(body !== undefined && { body }),
      },
    });

    res.json({ draft: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

module.exports = router;
