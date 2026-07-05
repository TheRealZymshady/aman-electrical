'use strict';

const EVENT_TYPES = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_STATUS_UPDATED: 'booking_status_updated',
  STATS_UPDATED: 'stats_updated',
};

/** @type {Map<number, { res: import('http').ServerResponse, scope: 'public' | 'admin' }>} */
const clients = new Map();
let clientIdCounter = 0;
let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(function () {
    broadcast('heartbeat', { ts: Date.now() });
  }, 30000);
  if (heartbeatTimer.unref) heartbeatTimer.unref();
}

function sendEvent(client, event, data) {
  try {
    client.res.write('event: ' + event + '\n');
    client.res.write('data: ' + JSON.stringify(data) + '\n');
    client.res.write('\n');
  } catch (_err) {
    // connection closed
  }
}

function broadcast(event, data, filter) {
  for (const client of clients.values()) {
    if (filter && !filter(client)) continue;
    sendEvent(client, event, data);
  }
}

function subscribe(res, scope) {
  const id = ++clientIdCounter;
  clients.set(id, { res, scope: scope === 'admin' ? 'admin' : 'public' });

  res.on('close', function () {
    clients.delete(id);
    if (clients.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });

  startHeartbeat();
  return id;
}

function unsubscribe(id) {
  clients.delete(id);
}

function getClientCount(scope) {
  if (!scope) return clients.size;
  let count = 0;
  for (const client of clients.values()) {
    if (client.scope === scope) count += 1;
  }
  return count;
}

function emitBookingCreated(payload) {
  broadcast(
    EVENT_TYPES.BOOKING_CREATED,
    {
      ticketId: payload.ticketId,
      receiptNo: payload.receiptNo,
      appliance: payload.appliance,
      preferredDate: payload.preferredDate,
      timeslot: payload.timeslot,
      status: 'pending',
    },
    function (c) { return c.scope === 'admin'; }
  );
  emitStatsUpdated();
}

function emitBookingStatusUpdated(payload) {
  const publicPayload = { ticketId: payload.ticketId, status: payload.status };

  broadcast(EVENT_TYPES.BOOKING_STATUS_UPDATED, publicPayload, function (c) {
    return c.scope === 'public';
  });

  broadcast(
    EVENT_TYPES.BOOKING_STATUS_UPDATED,
    {
      ticketId: payload.ticketId,
      status: payload.status,
      receiptNo: payload.receiptNo || null,
    },
    function (c) { return c.scope === 'admin'; }
  );

  emitStatsUpdated();
}

function emitStatsUpdated() {
  broadcast(
    EVENT_TYPES.STATS_UPDATED,
    { at: new Date().toISOString() },
    function (c) { return c.scope === 'admin'; }
  );
}

module.exports = {
  EVENT_TYPES,
  subscribe,
  unsubscribe,
  emitBookingCreated,
  emitBookingStatusUpdated,
  emitStatsUpdated,
  getClientCount,
};
