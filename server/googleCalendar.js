'use strict';

const crypto = require('crypto');
const { buildEventMeta } = require('./calendar');

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || '';
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

let cachedToken = null;
let tokenExpiresAt = 0;

function isConfigured() {
  return Boolean(CALENDAR_ID && SERVICE_ACCOUNT_JSON);
}

function loadServiceAccount() {
  try {
    return JSON.parse(SERVICE_ACCOUNT_JSON);
  } catch {
    return null;
  }
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const sa = loadServiceAccount();
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error_description || body.error || 'Google token request failed');
  }

  cachedToken = body.access_token;
  tokenExpiresAt = Date.now() + (body.expires_in || 3600) * 1000;
  return cachedToken;
}

async function createCalendarEvent(booking) {
  if (!isConfigured()) {
    return { created: false, reason: 'not_configured' };
  }

  const meta = buildEventMeta(booking);
  const token = await getAccessToken();

  const event = {
    summary: meta.summary,
    description: meta.description,
    location: meta.address,
    start: {
      dateTime: meta.start.toISOString(),
      timeZone: 'Asia/Kuala_Lumpur',
    },
    end: {
      dateTime: meta.end.toISOString(),
      timeZone: 'Asia/Kuala_Lumpur',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    extendedProperties: {
      private: {
        ticketId: meta.ticketId,
        receiptNo: meta.receiptNo || '',
      },
    },
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `Google Calendar error (${res.status})`);
  }

  return {
    created: true,
    eventId: body.id,
    htmlLink: body.htmlLink,
  };
}

async function syncBookingToCalendar(booking) {
  try {
    return await createCalendarEvent(booking);
  } catch (err) {
    console.warn('[Calendar] Google sync failed:', err.message);
    return { created: false, reason: err.message };
  }
}

module.exports = {
  isConfigured,
  syncBookingToCalendar,
  createCalendarEvent,
};
