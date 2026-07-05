'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'bookings.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL UNIQUE,
    receipt_no TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    appliance TEXT NOT NULL,
    preferred_date TEXT NOT NULL,
    timeslot TEXT NOT NULL,
    issue TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    receipt_no TEXT,
    action TEXT NOT NULL,
    details TEXT,
    actor TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sequences (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_ticket ON bookings(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_log(ticket_id);
`);

function migrate() {
  const cols = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
  if (!cols.includes('receipt_no')) {
    db.exec('ALTER TABLE bookings ADD COLUMN receipt_no TEXT');
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_receipt ON bookings(receipt_no)');

  const missing = db.prepare(
    "SELECT ticket_id FROM bookings WHERE receipt_no IS NULL OR receipt_no = ''"
  ).all();
  for (const row of missing) {
    const receiptNo = nextReceiptNo();
    db.prepare('UPDATE bookings SET receipt_no = ? WHERE ticket_id = ?').run(receiptNo, row.ticket_id);
  }
}

function nextReceiptNo() {
  const year = new Date().getFullYear();
  const key = `receipt_${year}`;
  db.prepare('INSERT INTO sequences (name, value) VALUES (?, 0) ON CONFLICT(name) DO NOTHING').run(key);
  const next = db.prepare('UPDATE sequences SET value = value + 1 WHERE name = ? RETURNING value').get(key);
  return `RC-${year}-${String(next.value).padStart(4, '0')}`;
}

migrate();

const insertBooking = db.prepare(`
  INSERT INTO bookings (ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, ip_hash)
  VALUES (@ticketId, @receiptNo, @name, @phone, @address, @appliance, @preferredDate, @timeslot, @issue, @ipHash)
`);

const insertAudit = db.prepare(`
  INSERT INTO audit_log (ticket_id, receipt_no, action, details, actor)
  VALUES (@ticketId, @receiptNo, @action, @details, @actor)
`);

const getBookingByTicket = db.prepare(`
  SELECT ticket_id, name, appliance, preferred_date, timeslot, status, created_at
  FROM bookings WHERE ticket_id = ?
`);

const getBookingForStatus = db.prepare(`
  SELECT ticket_id, receipt_no, appliance, preferred_date, timeslot, status, created_at
  FROM bookings WHERE ticket_id = ? AND substr(phone, -4) = ?
`);

const getBookingForReceipt = db.prepare(`
  SELECT ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at, updated_at
  FROM bookings WHERE ticket_id = ? AND substr(phone, -4) = ?
`);

const getBookingFullByTicket = db.prepare(`
  SELECT ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at, updated_at
  FROM bookings WHERE ticket_id = ?
`);

const listBookings = db.prepare(`
  SELECT ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at, updated_at
  FROM bookings ORDER BY created_at DESC LIMIT ?
`);

const listBookingsFiltered = db.prepare(`
  SELECT ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at, updated_at
  FROM bookings
  WHERE (@status = '' OR status = @status)
    AND (@fromDate = '' OR date(created_at) >= date(@fromDate))
    AND (@toDate = '' OR date(created_at) <= date(@toDate))
  ORDER BY created_at DESC
  LIMIT @limit
`);

const listAllBookingsForExport = db.prepare(`
  SELECT ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at, updated_at
  FROM bookings
  WHERE (@status = '' OR status = @status)
    AND (@fromDate = '' OR date(created_at) >= date(@fromDate))
    AND (@toDate = '' OR date(created_at) <= date(@toDate))
  ORDER BY created_at DESC
`);

const listAuditLog = db.prepare(`
  SELECT id, ticket_id, receipt_no, action, details, actor, created_at
  FROM audit_log ORDER BY created_at DESC LIMIT ?
`);

const listAuditForExport = db.prepare(`
  SELECT id, ticket_id, receipt_no, action, details, actor, created_at
  FROM audit_log
  WHERE (@fromDate = '' OR date(created_at) >= date(@fromDate))
    AND (@toDate = '' OR date(created_at) <= date(@toDate))
  ORDER BY created_at DESC
`);

const updateStatus = db.prepare(`
  UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE ticket_id = ?
`);

const listBookingsForCalendar = db.prepare(`
  SELECT ticket_id, receipt_no, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at
  FROM bookings
  WHERE status != 'cancelled'
    AND date(preferred_date) >= date('now', '-1 day')
    AND date(preferred_date) <= date('now', '+90 days')
  ORDER BY preferred_date ASC, created_at ASC
`);

const countBookings = db.prepare('SELECT COUNT(*) AS total FROM bookings');
const countByStatus = db.prepare(`
  SELECT status, COUNT(*) AS total FROM bookings GROUP BY status
`);

function logAudit({ ticketId, receiptNo, action, details, actor }) {
  insertAudit.run({
    ticketId: ticketId || null,
    receiptNo: receiptNo || null,
    action,
    details: details ? JSON.stringify(details) : null,
    actor: actor || 'system',
  });
}

function createBooking(data) {
  const receiptNo = nextReceiptNo();
  const result = insertBooking.run({ ...data, receiptNo });
  logAudit({
    ticketId: data.ticketId,
    receiptNo,
    action: 'booking_created',
    details: { appliance: data.appliance, preferredDate: data.preferredDate },
    actor: 'customer',
  });
  return { ...result, receiptNo };
}

function updateBookingStatus(ticketId, status, actor) {
  const existing = getBookingFullByTicket.get(ticketId);
  if (!existing) return null;
  updateStatus.run(status, ticketId);
  logAudit({
    ticketId,
    receiptNo: existing.receipt_no,
    action: 'status_updated',
    details: { from: existing.status, to: status },
    actor: actor || 'admin',
  });
  return existing;
}

function getDashboardStats() {
  return {
    total: countBookings.get().total,
    byStatus: countByStatus.all(),
  };
}

module.exports = {
  db,
  createBooking,
  getBookingByTicket,
  getBookingFullByTicket,
  getBookingForStatus,
  getBookingForReceipt,
  listBookings,
  listBookingsFiltered,
  listAllBookingsForExport,
  listAuditLog,
  listAuditForExport,
  listBookingsForCalendar,
  updateBookingStatus,
  logAudit,
  getDashboardStats,
};
