'use strict';

const crypto = require('crypto');

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Aman Electrical';
const PUBLIC_URL = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '').replace(/\/$/, '');
const TIMEZONE = 'Asia/Kuala_Lumpur';
const TZ_OFFSET = '+0800';

const TIMESLOT_HOURS = {
  'Morning (9am - 12pm)': { start: 9, end: 12 },
  'Afternoon (12pm - 3pm)': { start: 12, end: 15 },
  'Evening (3pm - 6pm)': { start: 15, end: 18 },
  'Flexible - any time': { start: 9, end: 18 },
};

function normalizeBooking(booking) {
  return {
    ticketId: booking.ticketId || booking.ticket_id,
    receiptNo: booking.receiptNo || booking.receipt_no || '',
    name: booking.name,
    phone: booking.phone,
    address: booking.address,
    appliance: booking.appliance,
    preferredDate: booking.preferredDate || booking.preferred_date,
    timeslot: booking.timeslot,
    issue: booking.issue,
    status: booking.status || 'pending',
  };
}

function parseAppointmentWindow(preferredDate, timeslot) {
  const hours = TIMESLOT_HOURS[timeslot] || TIMESLOT_HOURS['Flexible - any time'];
  const [year, month, day] = preferredDate.split('-').map(Number);

  const start = new Date(Date.UTC(year, month - 1, day, hours.start - 8, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, hours.end - 8, 0, 0));

  return { start, end, hours };
}

function formatIcsUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatIcsLocal(preferredDate, hour) {
  const [year, month, day] = preferredDate.split('-').map(Number);
  const hh = String(hour).padStart(2, '0');
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${hh}0000`;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldIcsLine(line) {
  const max = 75;
  if (line.length <= max) return line;
  const parts = [line.slice(0, max)];
  let i = max;
  while (i < line.length) {
    parts.push(' ' + line.slice(i, i + max - 1));
    i += max - 1;
  }
  return parts.join('\r\n');
}

function buildEventMeta(booking) {
  const b = normalizeBooking(booking);
  const { start, end } = parseAppointmentWindow(b.preferredDate, b.timeslot);
  const summary = `${b.appliance} repair — ${b.name} (${b.ticketId})`;
  const description = [
    `Work order: ${b.ticketId}`,
    b.receiptNo ? `Receipt: ${b.receiptNo}` : '',
    `Customer: ${b.name}`,
    `Phone: ${b.phone}`,
    `Appliance: ${b.appliance}`,
    `Time slot: ${b.timeslot}`,
    '',
    'Problem:',
    b.issue,
  ].filter(Boolean).join('\n');

  return {
    ...b,
    start,
    end,
    summary,
    description,
    uid: `booking-${b.ticketId}@aman-electrical`,
  };
}

function buildGoogleCalendarUrl(booking) {
  const meta = buildEventMeta(booking);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meta.summary,
    dates: `${formatIcsUtc(meta.start)}/${formatIcsUtc(meta.end)}`,
    details: meta.description,
    location: meta.address,
    ctz: TIMEZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsEvent(booking) {
  const meta = buildEventMeta(booking);
  const now = formatIcsUtc(new Date());
  const { hours } = parseAppointmentWindow(meta.preferredDate, meta.timeslot);

  const lines = [
    'BEGIN:VEVENT',
    foldIcsLine(`UID:${meta.uid}`),
    `DTSTAMP:${now}`,
    foldIcsLine(`DTSTART;TZID=${TIMEZONE}:${formatIcsLocal(meta.preferredDate, hours.start)}`),
    foldIcsLine(`DTEND;TZID=${TIMEZONE}:${formatIcsLocal(meta.preferredDate, hours.end)}`),
    foldIcsLine(`SUMMARY:${escapeIcsText(meta.summary)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(meta.description)}`),
    foldIcsLine(`LOCATION:${escapeIcsText(meta.address)}`),
    'STATUS:CONFIRMED',
    foldIcsLine(`CATEGORIES:${escapeIcsText(BUSINESS_NAME)}`),
    'END:VEVENT',
  ];

  return lines.join('\r\n');
}

function buildIcsCalendar(bookings, calendarName) {
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BUSINESS_NAME}//Repair Bookings//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName || BUSINESS_NAME + ' Jobs')}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    'BEGIN:VTIMEZONE',
    `TZID:${TIMEZONE}`,
    'X-LIC-LOCATION:Asia/Kuala_Lumpur',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    `TZOFFSETTO:${TZ_OFFSET}`,
    'TZNAME:+08',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n');

  const events = (bookings || []).map(buildIcsEvent).join('\r\n');
  return `${header}\r\n${events}\r\nEND:VCALENDAR\r\n`;
}

function buildBookingIcs(booking) {
  return buildIcsCalendar([booking], `${BUSINESS_NAME} — ${booking.ticketId || booking.ticket_id}`);
}

function buildCalendarLinks(booking) {
  const b = normalizeBooking(booking);
  const googleUrl = buildGoogleCalendarUrl(b);
  const ticketId = encodeURIComponent(b.ticketId);
  const base = PUBLIC_URL || '';
  const icsUrl = base ? `${base}/api/calendar/${ticketId}.ics` : `/api/calendar/${ticketId}.ics`;

  return { googleUrl, icsUrl };
}

function buildWhatsAppCalendarBlock(booking) {
  const { googleUrl, icsUrl } = buildCalendarLinks(booking);
  return [
    '',
    '📅 *Add to your calendar:*',
    googleUrl,
    PUBLIC_URL ? `Download .ics: ${icsUrl}` : '',
  ].filter(Boolean).join('\n');
}

function getPublicBaseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  if (!req) return '';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}

function buildFeedUrls(req, token) {
  const base = getPublicBaseUrl(req);
  const webcal = `webcal://${base.replace(/^https?:\/\//, '')}/api/calendar/feed.ics?token=${encodeURIComponent(token)}`;
  const https = `${base}/api/calendar/feed.ics?token=${encodeURIComponent(token)}`;
  const googleSubscribe = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(https)}`;
  return { webcal, https, googleSubscribe };
}

module.exports = {
  buildEventMeta,
  buildGoogleCalendarUrl,
  buildBookingIcs,
  buildIcsCalendar,
  buildCalendarLinks,
  buildWhatsAppCalendarBlock,
  buildFeedUrls,
  normalizeBooking,
};
