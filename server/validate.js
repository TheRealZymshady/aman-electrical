'use strict';

const APPLIANCES = new Set([
  'Washing machine',
  'Refrigerator',
  'Dishwasher',
  'Oven / stove',
  'Air conditioner',
  'Other',
]);

const TIMESLOTS = new Set([
  'Morning (9am - 12pm)',
  'Afternoon (12pm - 3pm)',
  'Evening (3pm - 6pm)',
  'Flexible - any time',
]);

const STATUSES = new Set(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']);

function stripControlChars(value) {
  return value.replace(/[\u0000-\u001F\u007F]/g, '');
}

function sanitizeText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return stripControlChars(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .trim()
    .slice(0, maxLen);
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return '60' + digits.slice(1);
  return digits;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

function validateBookingPayload(body) {
  const errors = [];

  if (body && body._website) {
    return { ok: false, errors: ['Request rejected.'], honeypot: true };
  }

  const name = sanitizeText(body?.name, 80);
  const phoneRaw = sanitizeText(body?.phone, 20);
  const address = sanitizeText(body?.address, 200);
  const appliance = sanitizeText(body?.appliance, 40);
  const preferredDate = sanitizeText(body?.preferredDate, 10);
  const timeslot = sanitizeText(body?.timeslot, 40);
  const issue = sanitizeText(body?.issue, 1000);

  if (name.length < 2) errors.push('Please enter your full name.');
  if (!normalizePhone(phoneRaw)) errors.push('Please enter a valid Malaysian phone number.');
  if (address.length < 5) errors.push('Please enter a complete service address.');
  if (!APPLIANCES.has(appliance)) errors.push('Please select a valid appliance.');
  if (!isValidDate(preferredDate)) errors.push('Please choose today or a future date.');
  if (!TIMESLOTS.has(timeslot)) errors.push('Please select a valid time slot.');
  if (issue.length < 10) errors.push('Please describe the problem in at least 10 characters.');

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      phone: normalizePhone(phoneRaw),
      address,
      appliance,
      preferredDate,
      timeslot,
      issue,
    },
  };
}

function validateStatusLookup(body) {
  const ticketId = sanitizeText(body?.ticketId, 12).toUpperCase();
  const phoneLast4 = sanitizeText(body?.phoneLast4, 4).replace(/\D/g, '');

  if (!/^FX-\d{4}$/.test(ticketId)) {
    return { ok: false, errors: ['Invalid work order number.'] };
  }
  if (phoneLast4.length !== 4) {
    return { ok: false, errors: ['Enter the last 4 digits of your phone number.'] };
  }

  return { ok: true, data: { ticketId, phoneLast4 } };
}

function validateStatusUpdate(body) {
  const ticketId = sanitizeText(body?.ticketId, 12).toUpperCase();
  const status = sanitizeText(body?.status, 20);

  if (!/^FX-\d{4}$/.test(ticketId)) {
    return { ok: false, errors: ['Invalid work order number.'] };
  }
  if (!STATUSES.has(status)) {
    return { ok: false, errors: ['Invalid status value.'] };
  }

  return { ok: true, data: { ticketId, status } };
}

function generateTicketId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `FX-${num}`;
}

module.exports = {
  validateBookingPayload,
  validateStatusLookup,
  validateStatusUpdate,
  generateTicketId,
  APPLIANCES,
  TIMESLOTS,
};
