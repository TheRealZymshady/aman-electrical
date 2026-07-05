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
  getBookingFullByTicket,
  listBookings,
  updateStatus,
} = require('./db');
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

app.use(globalLimiter);

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip) + CSRF_SECRET).digest('hex').slice(0, 16);
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
  let attempts = 0;
  while (attempts < 5) {
    try {
      createBooking({
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

  const booking = { ticketId, ...result.data };
  let whatsappNotified = false;

  try {
    const notifyResult = await Promise.race([
      notifyNewBooking(booking),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    whatsappNotified = Boolean(notifyResult?.sent);
  } catch (err) {
    console.warn('WhatsApp team alert failed:', err.message);
  }

  res.status(201).json({
    ticketId,
    message: 'Booking received successfully.',
    whatsappNumber: WHATSAPP_NUMBER,
    whatsappNotified,
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
    appliance: booking.appliance,
    preferredDate: booking.preferred_date,
    timeslot: booking.timeslot,
    status: booking.status,
    createdAt: booking.created_at,
  });
});

app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const rows = listBookings.all(limit);
  res.json({ bookings: rows });
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

  updateStatus.run(result.data.status, result.data.ticketId);

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
  if (!isProd) {
    console.log('Set CSRF_SECRET and ADMIN_API_KEY in .env before production deploy.');
  }
});
