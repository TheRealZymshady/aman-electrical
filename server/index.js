'use strict';

require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');

const {
  createBooking,
  getBookingForStatus,
  getBookingForReceipt,
  getBookingFullByTicket,
  listBookings,
  listBookingsFiltered,
  listAllBookingsForExport,
  listAuditLog,
  listAuditForExport,
  listBookingsForCalendar,
  updateBookingStatus,
  logAudit,
  getDashboardStats,
} = require('./db');
const { buildReceiptHtml, bookingsToCsv, auditToCsv } = require('./receipt');
const { buildBookingIcs, buildIcsCalendar, buildFeedUrls } = require('./calendar');
const { syncBookingToCalendar, isConfigured: googleCalendarReady } = require('./googleCalendar');
const {
  validateBookingPayload,
  validateStatusLookup,
  validateStatusUpdate,
  generateTicketId,
} = require('./validate');
const { notifyNewBooking, notifyStatusUpdate, isConfigured: whatsappReady, buildNewBookingText } = require('./whatsapp');

const PORT = Number(process.env.PORT) || 8765;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '601128731020';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const CALENDAR_FEED_TOKEN = process.env.CALENDAR_FEED_TOKEN || '';
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

if (isProd && (!process.env.CSRF_SECRET || !ADMIN_API_KEY)) {
  console.error('CSRF_SECRET and ADMIN_API_KEY must be set in production.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => req.ip || 'anonymous',
  cookieName: isProd ? '__Host-aman.x-csrf-token' : 'aman.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: isProd ? 'strict' : 'lax',
    secure: isProd,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

app.use(cookieParser());
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Booking limit reached. Please call us on WhatsApp instead.' },
});

const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many status lookups. Please try again later.' },
});

const receiptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many receipt requests. Please try again later.' },
});

app.use(globalLimiter);

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip) + CSRF_SECRET).digest('hex').slice(0, 16);
}

function requireCalendarFeed(req, res, next) {
  const token = String(req.query.token || req.get('authorization')?.replace(/^Bearer\s+/i, '') || '');
  if (!CALENDAR_FEED_TOKEN || !token || token.length !== CALENDAR_FEED_TOKEN.length) {
    return res.status(401).json({ error: 'Invalid calendar feed token.' });
  }
  const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(CALENDAR_FEED_TOKEN));
  if (!valid) return res.status(401).json({ error: 'Invalid calendar feed token.' });
  next();
}

function requireAdmin(req, res, next) {
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!ADMIN_API_KEY || !token || token.length !== ADMIN_API_KEY.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_API_KEY));
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aman-electrical' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    whatsappNumber: WHATSAPP_NUMBER,
    whatsappAlerts: whatsappReady(),
  });
});

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

app.post('/api/bookings', bookingLimiter, doubleCsrfProtection, async (req, res) => {
  const result = validateBookingPayload(req.body);
  if (!result.ok) {
    const status = result.honeypot ? 400 : 422;
    return res.status(status).json({ error: result.errors[0], errors: result.errors });
  }

  let ticketId = generateTicketId();
  let receiptNo = '';
  let attempts = 0;
  while (attempts < 5) {
    try {
      const inserted = createBooking({
        ticketId,
        name: result.data.name,
        phone: result.data.phone,
        address: result.data.address,
        appliance: result.data.appliance,
        preferredDate: result.data.preferredDate,
        timeslot: result.data.timeslot,
        issue: result.data.issue,
        ipHash: hashIp(req.ip),
      });
      receiptNo = inserted.receiptNo;
      break;
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        ticketId = generateTicketId();
        attempts += 1;
        continue;
      }
      console.error('Booking insert failed:', err.message);
      return res.status(500).json({ error: 'Unable to save booking. Please try WhatsApp.' });
    }
  }

  if (attempts >= 5) {
    return res.status(500).json({ error: 'Unable to create work order. Please try again.' });
  }

  const booking = { ticketId, receiptNo, ...result.data };
  let whatsappNotified = false;
  let calendarSynced = false;

  try {
    const notifyResult = await Promise.race([
      notifyNewBooking(booking),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    whatsappNotified = Boolean(notifyResult?.sent);
  } catch (err) {
    console.warn('WhatsApp team alert failed:', err.message);
  }

  try {
    const calResult = await Promise.race([
      syncBookingToCalendar(booking),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    calendarSynced = Boolean(calResult?.created);
    if (calendarSynced) {
      logAudit({
        ticketId,
        receiptNo,
        action: 'calendar_event_created',
        details: { eventId: calResult.eventId },
        actor: 'system',
      });
    }
  } catch (err) {
    console.warn('Calendar sync failed:', err.message);
  }

  const phoneLast4 = result.data.phone.replace(/\D/g, '').slice(-4);
  res.status(201).json({
    ticketId,
    receiptNo,
    receiptUrl: `/receipt.html?ticket=${encodeURIComponent(ticketId)}&phone=${phoneLast4}`,
    message: 'Booking received successfully.',
    whatsappNumber: WHATSAPP_NUMBER,
    whatsappNotified,
    calendarSynced,
    whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildNewBookingText(booking))}`,
  });
});

app.post('/api/bookings/status', statusLimiter, doubleCsrfProtection, (req, res) => {
  const result = validateStatusLookup(req.body);
  if (!result.ok) {
    return res.status(422).json({ error: result.errors[0], errors: result.errors });
  }

  const booking = getBookingForStatus.get(result.data.ticketId, result.data.phoneLast4);
  if (!booking) {
    return res.status(404).json({ error: 'No booking found with those details.' });
  }

  res.json({
    ticketId: booking.ticket_id,
    receiptNo: booking.receipt_no,
    receiptUrl: `/receipt.html?ticket=${encodeURIComponent(booking.ticket_id)}&phone=${result.data.phoneLast4}`,
    appliance: booking.appliance,
    preferredDate: booking.preferred_date,
    timeslot: booking.timeslot,
    status: booking.status,
    createdAt: booking.created_at,
  });
});

function exportFilters(req) {
  return {
    status: String(req.query.status || '').trim(),
    fromDate: String(req.query.from || '').trim(),
    toDate: String(req.query.to || '').trim(),
    limit: Math.min(Number(req.query.limit) || 200, 500),
  };
}

app.get('/api/receipt', receiptLimiter, (req, res) => {
  const ticketRaw = String(req.query.ticket || '').trim().toUpperCase();
  const ticketId = ticketRaw.startsWith('FX-') ? ticketRaw : (ticketRaw ? `FX-${ticketRaw}` : '');
  const phoneLast4 = String(req.query.phone || '').replace(/\D/g, '').slice(-4);

  if (!ticketId || phoneLast4.length !== 4) {
    return res.status(422).json({ error: 'Work order and last 4 phone digits are required.' });
  }

  const booking = getBookingForReceipt.get(ticketId, phoneLast4);
  if (!booking) {
    return res.status(404).json({ error: 'No receipt found with those details.' });
  }

  logAudit({
    ticketId: booking.ticket_id,
    receiptNo: booking.receipt_no,
    action: 'receipt_viewed',
    details: { via: 'customer' },
    actor: 'customer',
  });

  const accept = req.get('accept') || '';
  if (accept.includes('application/json')) {
    return res.json({
      ticketId: booking.ticket_id,
      receiptNo: booking.receipt_no,
      html: buildReceiptHtml(booking, { verified: true }),
    });
  }

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(buildReceiptHtml(booking, { verified: true }));
});

app.get('/api/calendar/feed.ics', requireCalendarFeed, (_req, res) => {
  const bookings = listBookingsForCalendar.all();
  const ics = buildIcsCalendar(bookings, 'Aman Electrical — Repair Jobs');
  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', 'inline; filename="aman-jobs.ics"');
  res.set('Cache-Control', 'private, max-age=300');
  res.send(ics);
});

app.get('/api/calendar/:ticketId.ics', (req, res) => {
  const ticketRaw = String(req.params.ticketId || '').replace(/\.ics$/i, '').trim().toUpperCase();
  const ticketId = ticketRaw.startsWith('FX-') ? ticketRaw : `FX-${ticketRaw}`;
  const booking = getBookingFullByTicket.get(ticketId);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  res.set('Content-Type', 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${ticketId}.ics"`);
  res.send(buildBookingIcs(booking));
});

app.get('/api/admin/calendar', requireAdmin, (req, res) => {
  const token = CALENDAR_FEED_TOKEN;
  const urls = token ? buildFeedUrls(req, token) : null;
  res.json({
    googleCalendarConfigured: googleCalendarReady(),
    feedConfigured: Boolean(token),
    feedUrls: urls,
    setup: {
      iphone: 'Settings → Calendar → Accounts → Add Subscribed Calendar → paste the webcal URL',
      google: 'Google Calendar → Settings → Add calendar → From URL → paste the https feed URL',
      oneTime: 'Each WhatsApp booking alert includes a Google Calendar link — tap it to add that job instantly',
    },
  });
});

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  res.json(getDashboardStats());
});

app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  const filters = exportFilters(req);
  const rows = filters.status || filters.fromDate || filters.toDate
    ? listBookingsFiltered.all(filters)
    : listBookings.all(filters.limit);
  res.json({ bookings: rows });
});

app.get('/api/admin/audit', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = listAuditLog.all(limit);
  res.json({ audit: rows });
});

app.get('/api/admin/receipt/:ticketId', requireAdmin, (req, res) => {
  const ticketRaw = String(req.params.ticketId || '').trim().toUpperCase();
  const ticketId = ticketRaw.startsWith('FX-') ? ticketRaw : `FX-${ticketRaw}`;
  const booking = getBookingFullByTicket.get(ticketId);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  logAudit({
    ticketId: booking.ticket_id,
    receiptNo: booking.receipt_no,
    action: 'receipt_viewed',
    details: { via: 'admin' },
    actor: 'admin',
  });

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(buildReceiptHtml(booking, { verified: true }));
});

app.get('/api/admin/export/bookings', requireAdmin, (req, res) => {
  const filters = exportFilters(req);
  const rows = listAllBookingsForExport.all(filters);
  const format = String(req.query.format || 'csv').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  logAudit({
    action: 'export_bookings',
    details: { format, count: rows.length, filters },
    actor: 'admin',
  });

  if (format === 'json') {
    res.set('Content-Disposition', `attachment; filename="aman-bookings-${stamp}.json"`);
    return res.json({ exportedAt: new Date().toISOString(), count: rows.length, bookings: rows });
  }

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="aman-bookings-${stamp}.csv"`);
  res.send('\uFEFF' + bookingsToCsv(rows));
});

app.get('/api/admin/export/audit', requireAdmin, (req, res) => {
  const filters = { fromDate: String(req.query.from || ''), toDate: String(req.query.to || '') };
  const rows = listAuditForExport.all(filters);
  const format = String(req.query.format || 'csv').toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);

  logAudit({
    action: 'export_audit',
    details: { format, count: rows.length, filters },
    actor: 'admin',
  });

  if (format === 'json') {
    res.set('Content-Disposition', `attachment; filename="aman-audit-${stamp}.json"`);
    return res.json({ exportedAt: new Date().toISOString(), count: rows.length, audit: rows });
  }

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="aman-audit-${stamp}.csv"`);
  res.send('\uFEFF' + auditToCsv(rows));
});

app.patch('/api/admin/bookings/status', requireAdmin, async (req, res) => {
  const result = validateStatusUpdate(req.body);
  if (!result.ok) {
    return res.status(422).json({ error: result.errors[0], errors: result.errors });
  }

  const existing = getBookingFullByTicket.get(result.data.ticketId);
  if (!existing) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  updateBookingStatus(result.data.ticketId, result.data.status, 'admin');

  let whatsappNotified = false;
  try {
    const booking = {
      ticketId: existing.ticket_id,
      name: existing.name,
      phone: existing.phone,
      address: existing.address,
      appliance: existing.appliance,
      preferredDate: existing.preferred_date,
      timeslot: existing.timeslot,
      issue: existing.issue,
    };
    const notifyResult = await Promise.race([
      notifyStatusUpdate(booking, result.data.status),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    whatsappNotified = Boolean(notifyResult?.sent);
  } catch (err) {
    console.warn('WhatsApp status alert failed:', err.message);
  }

  res.json({
    ticketId: result.data.ticketId,
    receiptNo: existing.receipt_no,
    status: result.data.status,
    whatsappNotified,
  });
});

app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: isProd ? '1d' : 0,
  etag: true,
  index: 'index.html',
}));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, _next) => {
  if (err?.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Security token expired. Please refresh and try again.' });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  console.log(`Aman Electrical live at ${publicUrl} (${NODE_ENV})`);
  if (!whatsappReady()) {
    console.log('WhatsApp API: not configured — bookings use wa.me links to notify the team.');
  }
  if (googleCalendarReady()) {
    console.log('Google Calendar: auto-sync enabled for new bookings.');
  } else if (CALENDAR_FEED_TOKEN) {
    console.log('Calendar feed: technicians can subscribe to /api/calendar/feed.ics');
  }
  if (!isProd) {
    console.log('Set CSRF_SECRET and ADMIN_API_KEY in .env before production deploy.');
  }
});
