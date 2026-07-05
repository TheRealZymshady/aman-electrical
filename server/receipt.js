'use strict';

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Aman Electrical';
const BUSINESS_PHONE = process.env.WHATSAPP_NUMBER || '601128731020';

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'Z').toLocaleString('en-MY', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-MY', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return '***' + digits.slice(-4);
}

function buildReceiptHtml(booking, options = {}) {
  const { printMode = false, verified = true } = options;
  const status = STATUS_LABELS[booking.status] || booking.status;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${booking.receipt_no} — ${BUSINESS_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #f7f4ef;
      color: #3a3632;
      padding: 24px;
      line-height: 1.5;
    }
    .receipt {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e5ddd2;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(58,54,50,0.08);
    }
    .receipt-head {
      background: linear-gradient(135deg, #8b1515, #a61e1e);
      color: #fff;
      padding: 28px 32px;
    }
    .receipt-head h1 { font-size: 22px; margin-bottom: 4px; }
    .receipt-head p { opacity: 0.9; font-size: 14px; }
    .receipt-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 20px 32px;
      background: #faf8f5;
      border-bottom: 1px dashed #e5ddd2;
      font-size: 13px;
    }
    .receipt-meta strong { display: block; color: #8b1515; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
    .receipt-body { padding: 24px 32px 32px; }
    .section { margin-bottom: 22px; }
    .section h2 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #8b1515;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #eee8df;
    }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 14px; }
    .row span:first-child { color: #6b6560; }
    .row span:last-child { font-weight: 600; text-align: right; }
    .issue-box {
      background: #faf8f5;
      border: 1px solid #e5ddd2;
      border-radius: 8px;
      padding: 14px;
      font-size: 14px;
      white-space: pre-wrap;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
      background: #eaf4ee;
      color: #2d6a4f;
    }
    .receipt-foot {
      padding: 16px 32px 24px;
      font-size: 12px;
      color: #6b6560;
      border-top: 1px dashed #e5ddd2;
      text-align: center;
    }
    .actions {
      max-width: 640px;
      margin: 20px auto 0;
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn {
      padding: 12px 22px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary { background: #8b1515; color: #fff; }
    .btn-ghost { background: #fff; color: #3a3632; border: 1px solid #e5ddd2; }
    @media print {
      body { background: #fff; padding: 0; }
      .actions { display: none !important; }
      .receipt { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-head">
      <h1>${BUSINESS_NAME}</h1>
      <p>Official Service Receipt · Appliance Repair</p>
    </div>
    <div class="receipt-meta">
      <div><strong>Receipt No.</strong>${booking.receipt_no || '—'}</div>
      <div><strong>Work Order</strong>${booking.ticket_id}</div>
      <div><strong>Issued</strong>${formatDateTime(booking.created_at)}</div>
      <div><strong>Status</strong><span class="status-badge">${status}</span></div>
    </div>
    <div class="receipt-body">
      <div class="section">
        <h2>Customer</h2>
        <div class="row"><span>Name</span><span>${escapeHtml(booking.name)}</span></div>
        <div class="row"><span>Phone</span><span>${verified ? escapeHtml(booking.phone) : maskPhone(booking.phone)}</span></div>
        <div class="row"><span>Address</span><span>${escapeHtml(booking.address)}</span></div>
      </div>
      <div class="section">
        <h2>Service Details</h2>
        <div class="row"><span>Appliance</span><span>${escapeHtml(booking.appliance)}</span></div>
        <div class="row"><span>Scheduled Date</span><span>${formatDate(booking.preferred_date)}</span></div>
        <div class="row"><span>Time Slot</span><span>${escapeHtml(booking.timeslot)}</span></div>
      </div>
      <div class="section">
        <h2>Problem Reported</h2>
        <div class="issue-box">${escapeHtml(booking.issue)}</div>
      </div>
    </div>
    <div class="receipt-foot">
      Keep this receipt for your records. Contact us on WhatsApp: ${formatPhoneDisplay(BUSINESS_PHONE)}<br>
      Generated ${formatDateTime(new Date().toISOString())} · ${BUSINESS_NAME}
    </div>
  </div>
  ${printMode ? '' : `<div class="actions">
    <button type="button" class="btn btn-primary" id="printBtn">Print / Save PDF</button>
    <a class="btn btn-ghost" href="/">Back to website</a>
  </div>
  <script src="/js/receipt-print.js"></script>`}
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPhoneDisplay(num) {
  const d = String(num).replace(/\D/g, '');
  if (d.startsWith('60')) return '0' + d.slice(2);
  return d;
}

function bookingsToCsv(rows) {
  const headers = [
    'receipt_no', 'ticket_id', 'name', 'phone', 'address', 'appliance',
    'preferred_date', 'timeslot', 'issue', 'status', 'created_at', 'updated_at',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','));
  }
  return lines.join('\n');
}

function auditToCsv(rows) {
  const headers = ['id', 'ticket_id', 'receipt_no', 'action', 'details', 'actor', 'created_at'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','));
  }
  return lines.join('\n');
}

function csvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

module.exports = {
  buildReceiptHtml,
  bookingsToCsv,
  auditToCsv,
  STATUS_LABELS,
};
