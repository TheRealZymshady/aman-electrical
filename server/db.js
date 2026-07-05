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

  CREATE INDEX IF NOT EXISTS idx_bookings_ticket ON bookings(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
`);

const insertBooking = db.prepare(`
  INSERT INTO bookings (ticket_id, name, phone, address, appliance, preferred_date, timeslot, issue, ip_hash)
  VALUES (@ticketId, @name, @phone, @address, @appliance, @preferredDate, @timeslot, @issue, @ipHash)
`);

const getBookingByTicket = db.prepare(`
  SELECT ticket_id, name, appliance, preferred_date, timeslot, status, created_at
  FROM bookings WHERE ticket_id = ?
`);

const getBookingForStatus = db.prepare(`
  SELECT ticket_id, appliance, preferred_date, timeslot, status, created_at
  FROM bookings WHERE ticket_id = ? AND substr(phone, -4) = ?
`);

const listBookings = db.prepare(`
  SELECT ticket_id, name, phone, appliance, preferred_date, timeslot, status, created_at
  FROM bookings ORDER BY created_at DESC LIMIT ?
`);

const getBookingFullByTicket = db.prepare(`
  SELECT ticket_id, name, phone, address, appliance, preferred_date, timeslot, issue, status, created_at
  FROM bookings WHERE ticket_id = ?
`);

const updateStatus = db.prepare(`
  UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE ticket_id = ?
`);

function createBooking(data) {
  return insertBooking.run(data);
}

module.exports = {
  db,
  createBooking,
  getBookingByTicket,
  getBookingFullByTicket,
  getBookingForStatus,
  listBookings,
  updateStatus,
};
