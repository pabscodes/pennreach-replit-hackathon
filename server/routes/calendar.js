const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { isConfigured, getAuthenticatedClient } = require('../services/google');
const { google } = require('googleapis');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.get('/status', async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.json({ configured: false, connected: false });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const connected = !!(user && user.googleAccessToken);
    res.json({ configured: true, connected });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check calendar status' });
  }
});

router.get('/free-slots', async (req, res) => {
  try {
    const authClient = await getAuthenticatedClient(req.userId);
    if (!authClient) {
      return res.json({ configured: false, connected: false, slots: [] });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const workStart = user.workingHoursStart ?? 10;
    const workEnd = user.workingHoursEnd ?? 17;
    const tz = user.timezone || 'America/New_York';

    const daysAhead = parseInt(req.query.days) || 7;

    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysAhead);

    const freebusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: tz,
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = freebusyResponse.data.calendars.primary?.busy || [];

    const freeSlots = [];
    const currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);

    for (let d = 0; d < daysAhead; d++) {
      const day = new Date(currentDate);
      day.setDate(day.getDate() + d);

      if (day.getDay() === 0 || day.getDay() === 6) continue;

      const dayStart = new Date(day);
      dayStart.setHours(workStart, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(workEnd, 0, 0, 0);

      if (dayEnd <= now) continue;
      const effectiveStart = dayStart < now ? now : dayStart;

      const dayBusy = busySlots
        .map(b => ({ start: new Date(b.start), end: new Date(b.end) }))
        .filter(b => b.start < dayEnd && b.end > effectiveStart)
        .sort((a, b) => a.start - b.start);

      let cursor = new Date(effectiveStart);
      cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30, 0, 0);

      for (const busy of dayBusy) {
        while (cursor.getTime() + 30 * 60 * 1000 <= busy.start.getTime() && cursor.getTime() + 30 * 60 * 1000 <= dayEnd.getTime()) {
          freeSlots.push({
            start: cursor.toISOString(),
            end: new Date(cursor.getTime() + 30 * 60 * 1000).toISOString(),
            label: formatSlotLabel(cursor, tz),
          });
          cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
        }
        cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
        cursor.setMinutes(Math.ceil(cursor.getMinutes() / 30) * 30, 0, 0);
      }

      while (cursor.getTime() + 30 * 60 * 1000 <= dayEnd.getTime()) {
        freeSlots.push({
          start: cursor.toISOString(),
          end: new Date(cursor.getTime() + 30 * 60 * 1000).toISOString(),
          label: formatSlotLabel(cursor, tz),
        });
        cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
      }
    }

    res.json({ configured: true, connected: true, slots: freeSlots.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch free slots' });
  }
});

function formatSlotLabel(date, tz) {
  try {
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz,
    };
    return date.toLocaleString('en-US', options);
  } catch {
    return date.toISOString();
  }
}

router.get('/availability', async (req, res) => {
  try {
    const authClient = await getAuthenticatedClient(req.userId);
    if (!authClient) {
      return res.json({
        configured: isConfigured(),
        connected: false,
        message: 'Connect Google Calendar in Settings to enable automatic availability detection.',
        availability: null,
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const workStart = user.workingHoursStart ?? 10;
    const workEnd = user.workingHoursEnd ?? 17;
    const tz = user.timezone || 'America/New_York';

    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);

    const freebusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: tz,
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = freebusyResponse.data.calendars.primary?.busy || [];

    const availableDays = [];
    for (let d = 1; d <= 7; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0 || day.getDay() === 6) continue;

      const dayStart = new Date(day);
      dayStart.setHours(workStart, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(workEnd, 0, 0, 0);

      const dayBusy = busySlots.filter(
        b => new Date(b.start) < dayEnd && new Date(b.end) > dayStart
      );

      let freeHours = workEnd - workStart;
      for (const b of dayBusy) {
        const bStart = Math.max(new Date(b.start).getTime(), dayStart.getTime());
        const bEnd = Math.min(new Date(b.end).getTime(), dayEnd.getTime());
        freeHours -= (bEnd - bStart) / (1000 * 60 * 60);
      }

      if (freeHours >= 0.5) {
        const dayLabel = day.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: tz,
        });
        availableDays.push(`${dayLabel} (${Math.round(freeHours)}h free between ${workStart > 12 ? workStart - 12 + ' PM' : workStart + ' AM'}-${workEnd > 12 ? workEnd - 12 + ' PM' : workEnd + ' AM'})`);
      }
    }

    const availabilityText = availableDays.length > 0
      ? `Available: ${availableDays.join(', ')}`
      : 'No clear availability found in the next week';

    res.json({
      configured: true,
      connected: true,
      availability: availabilityText,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to check availability' });
  }
});

module.exports = router;
