const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, COOKIE_OPTIONS);

    const { passwordHash: _, hunterApiKey: _h, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
    res.status(201).json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, COOKIE_OPTIONS);

    const { passwordHash: _, hunterApiKey: _h, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, hunterApiKey: _h, googleAccessToken: _g, googleRefreshToken: _gr, ...safeUser } = user;
    safeUser.hasHunterKey = !!user.hunterApiKey;
    safeUser.hasGoogleAuth = !!user.googleAccessToken;
    safeUser.displayName = user.preferredName || user.firstName || user.name || '';
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
});

module.exports = router;
