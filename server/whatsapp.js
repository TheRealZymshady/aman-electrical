'use strict';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const NOTIFY_NUMBERS = (process.env.WHATSAPP_NOTIFY_NUMBERS || process.env.WHATSAPP_NUMBER || '601128731020')
  .split(',')
  .map((n) => n.trim().replace(/\D/g, ''))
  .filter(Boolean);

const TEMPLATE_NEW_BOOKING = process.env.WHATSAPP_TEMPLATE_NEW_BOOKING || '';
const TEMPLATE_STATUS_UPDATE = process.env.WHATSAPP_TEMPLATE_STATUS_UPDATE || '';
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Aman Electrical';

function isConfigured() {
  return Boolean(PHONE_NUMBER_ID && API_TOKEN);
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return '60' + digits.slice(1);
  return digits;
}

async function sendRequest(payload) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      ...payload,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `WhatsApp API error (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

async function sendTextMessage(to, text) {
  return sendRequest({
    to: normalizePhone(to),
    type: 'text',
    text: { preview_url: false, body: text.slice(0, 4096) },
  });
}

async function sendTemplateMessage(to, templateName, bodyParams) {
  return sendRequest({
    to: normalizePhone(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: bodyParams.map((text) => ({
            type: 'text',
            text: String(text).slice(0, 256),
          })),
        },
      ],
    },
  });
}

async function sendToRecipients(recipients, sendFn) {
  const unique = [...new Set(recipients.map(normalizePhone).filter(Boolean))];
  const results = await Promise.allSettled(unique.map((to) => sendFn(to)));
  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message || 'send failed');

  if (sent === 0 && errors.length) {
    throw new Error(errors[0]);
  }

  return { sent, total: unique.length, errors };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatStatusLabel(status) {
  const labels = {
    pending: 'Received — we will call you shortly',
    confirmed: 'Confirmed — your appointment is booked',
    in_progress: 'In progress — our technician is working on your repair',
    completed: 'Completed — thank you for choosing us',
    cancelled: 'Cancelled — contact us to reschedule',
  };
  return labels[status] || status;
}

const { buildWhatsAppCalendarBlock, buildGoogleCalendarUrl } = require('./calendar');

function buildNewBookingText(booking) {
  return [
    `🔧 *NEW REPAIR REQUEST — ${BUSINESS_NAME}*`,
    '',
    `*Work Order:* ${booking.ticketId}`,
    `*Name:* ${booking.name}`,
    `*Phone:* ${booking.phone}`,
    `*Address:* ${booking.address}`,
    `*Appliance:* ${booking.appliance}`,
    `*Date:* ${formatDate(booking.preferredDate)}`,
    `*Time:* ${booking.timeslot}`,
    '',
    '*Problem:*',
    booking.issue,
    buildWhatsAppCalendarBlock(booking),
  ].join('\n');
}

async function sendCalendarAlert(to, booking) {
  const googleUrl = buildGoogleCalendarUrl(booking);
  const text = [
    `📅 *Calendar — ${booking.ticketId}*`,
    `Tap to add this repair job to your phone calendar:`,
    googleUrl,
  ].join('\n');

  return sendRequest({
    to: normalizePhone(to),
    type: 'text',
    text: { preview_url: true, body: text.slice(0, 4096) },
  });
}

function buildStatusUpdateText(booking, status) {
  return [
    `Hi ${booking.name},`,
    '',
    `Your ${BUSINESS_NAME} repair *${booking.ticketId}* update:`,
    `*${formatStatusLabel(status)}*`,
    '',
    `Appliance: ${booking.appliance}`,
    `Scheduled: ${formatDate(booking.preferredDate)} — ${booking.timeslot}`,
    '',
    'Reply to this chat if you have questions.',
  ].join('\n');
}

async function notifyNewBooking(booking) {
  if (!isConfigured()) {
    console.log('[WhatsApp] Not configured — skipping team alert for', booking.ticketId);
    return { sent: false, reason: 'not_configured' };
  }

  const text = buildNewBookingText(booking);
  const calendarBlock = buildWhatsAppCalendarBlock(booking);

  if (TEMPLATE_NEW_BOOKING) {
    const params = [
      booking.ticketId,
      booking.name,
      booking.phone,
      booking.appliance,
      formatDate(booking.preferredDate),
      booking.timeslot,
      booking.issue.slice(0, 200),
    ];
    const result = await sendToRecipients(NOTIFY_NUMBERS, async (to) => {
      await sendTemplateMessage(to, TEMPLATE_NEW_BOOKING, params);
      await sendCalendarAlert(to, booking);
    });
    return { sent: result.sent > 0, ...result, mode: 'template' };
  }

  const result = await sendToRecipients(NOTIFY_NUMBERS, async (to) => {
    await sendRequest({
      to: normalizePhone(to),
      type: 'text',
      text: { preview_url: true, body: text.slice(0, 4096) },
    });
  });
  return { sent: result.sent > 0, ...result, mode: 'text' };
}

async function notifyStatusUpdate(booking, status) {
  if (!isConfigured()) {
    console.log('[WhatsApp] Not configured — skipping status alert for', booking.ticketId);
    return { sent: false, reason: 'not_configured' };
  }

  const customerPhone = normalizePhone(booking.phone);
  if (!customerPhone) {
    return { sent: false, reason: 'no_phone' };
  }

  if (TEMPLATE_STATUS_UPDATE) {
    const params = [
      booking.name,
      booking.ticketId,
      formatStatusLabel(status),
      booking.appliance,
      formatDate(booking.preferredDate),
    ];
    await sendTemplateMessage(customerPhone, TEMPLATE_STATUS_UPDATE, params);
    return { sent: true, mode: 'template' };
  }

  const text = buildStatusUpdateText(booking, status);
  await sendTextMessage(customerPhone, text);
  return { sent: true, mode: 'text' };
}

module.exports = {
  isConfigured,
  notifyNewBooking,
  notifyStatusUpdate,
  buildNewBookingText,
  buildStatusUpdateText,
  NOTIFY_NUMBERS,
};
