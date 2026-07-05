'use strict';

const STORAGE_KEY = 'aman-admin-key';
let apiKey = sessionStorage.getItem(STORAGE_KEY) || '';
let activePanel = 'orders';

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const globalAlert = document.getElementById('globalAlert');
const summaryBar = document.getElementById('summaryBar');
const ordersBody = document.getElementById('ordersBody');
const auditBody = document.getElementById('auditBody');
const ordersPanel = document.getElementById('ordersPanel');
const auditPanel = document.getElementById('auditPanel');
const calendarPanel = document.getElementById('calendarPanel');
const logoutBtn = document.getElementById('logoutBtn');

function showAlert(msg, type) {
  globalAlert.textContent = msg;
  globalAlert.className = 'alert alert-' + (type === 'error' ? 'error' : 'success');
  globalAlert.classList.remove('hidden');
  setTimeout(function () { globalAlert.classList.add('hidden'); }, 5000);
}

function authHeaders() {
  return { Authorization: 'Bearer ' + apiKey };
}

async function apiFetch(url, options) {
  const res = await fetch(url, Object.assign({ headers: authHeaders() }, options || {}));
  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please sign in again.');
  }
  return res;
}

async function apiJson(url, options) {
  const res = await apiFetch(url, options);
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

function logout() {
  apiKey = '';
  sessionStorage.removeItem(STORAGE_KEY);
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'Z').toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatStatus(status) {
  return String(status || '').replace(/_/g, ' ');
}

function getFilters() {
  return {
    status: document.getElementById('filterStatus').value,
    from: document.getElementById('filterFrom').value,
    to: document.getElementById('filterTo').value,
  };
}

function filterQuery() {
  const f = getFilters();
  const params = new URLSearchParams();
  if (f.status) params.set('status', f.status);
  if (f.from) params.set('from', f.from);
  if (f.to) params.set('to', f.to);
  return params.toString();
}

function setLoading(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !on);
}

async function loadSummary() {
  const data = await apiJson('/api/admin/stats');
  const parts = ['<strong>' + data.total + '</strong> total orders'];
  (data.byStatus || []).forEach(function (row) {
    if (row.total > 0) {
      parts.push(row.total + ' ' + formatStatus(row.status));
    }
  });
  summaryBar.innerHTML = parts.join(' · ');
}

async function loadOrders() {
  setLoading('ordersLoading', true);
  try {
    const qs = filterQuery();
    const data = await apiJson('/api/admin/bookings' + (qs ? '?' + qs : ''));
    ordersBody.innerHTML = '';

    if (!data.bookings.length) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      const td = document.createElement('td');
      td.colSpan = 8;
      td.textContent = getFilters().status || getFilters().from || getFilters().to
        ? 'No orders match your filters.'
        : 'No orders yet.';
      tr.appendChild(td);
      ordersBody.appendChild(tr);
      return;
    }

    data.bookings.forEach(function (b) {
      const tr = document.createElement('tr');

      const receiptTd = document.createElement('td');
      receiptTd.textContent = b.receipt_no || '—';

      const ticketTd = document.createElement('td');
      ticketTd.textContent = b.ticket_id;

      const nameTd = document.createElement('td');
      nameTd.textContent = b.name;

      const phoneTd = document.createElement('td');
      phoneTd.textContent = b.phone;

      const applianceTd = document.createElement('td');
      applianceTd.textContent = b.appliance;

      const dateTd = document.createElement('td');
      dateTd.textContent = b.preferred_date;

      const statusTd = document.createElement('td');
      const select = document.createElement('select');
      ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].forEach(function (s) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = formatStatus(s);
        if (s === b.status) opt.selected = true;
        select.appendChild(opt);
      });
      statusTd.appendChild(select);

      const actionsTd = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', function () {
        updateStatus(b.ticket_id, select.value, saveBtn);
      });

      const receiptBtn = document.createElement('button');
      receiptBtn.type = 'button';
      receiptBtn.className = 'btn btn-ghost btn-sm';
      receiptBtn.textContent = 'Receipt';
      receiptBtn.addEventListener('click', function () {
        openReceipt(b.ticket_id, receiptBtn);
      });

      actions.appendChild(saveBtn);
      actions.appendChild(receiptBtn);
      actionsTd.appendChild(actions);

      tr.appendChild(receiptTd);
      tr.appendChild(ticketTd);
      tr.appendChild(nameTd);
      tr.appendChild(phoneTd);
      tr.appendChild(applianceTd);
      tr.appendChild(dateTd);
      tr.appendChild(statusTd);
      tr.appendChild(actionsTd);
      ordersBody.appendChild(tr);
    });
  } finally {
    setLoading('ordersLoading', false);
  }
}

async function openReceipt(ticketId, btn) {
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const res = await apiFetch('/api/admin/receipt/' + encodeURIComponent(ticketId));
    if (!res.ok) {
      const body = await res.json().catch(function () { return {}; });
      throw new Error(body.error || 'Could not load receipt');
    }
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener');
    if (!win) throw new Error('Pop-up blocked. Allow pop-ups for this site.');
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

async function updateStatus(ticketId, status, btn) {
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const res = await apiFetch('/api/admin/bookings/status', {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ ticketId, status }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Update failed');
    showAlert(ticketId + ' updated to ' + formatStatus(status));
    await Promise.all([loadSummary(), loadOrders()]);
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
}

async function loadAudit() {
  setLoading('auditLoading', true);
  try {
    const data = await apiJson('/api/admin/audit?limit=100');
    auditBody.innerHTML = '';

    if (!data.audit.length) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No audit entries yet.';
      tr.appendChild(td);
      auditBody.appendChild(tr);
      return;
    }

    data.audit.forEach(function (row) {
      const tr = document.createElement('tr');

      const timeTd = document.createElement('td');
      timeTd.textContent = formatDate(row.created_at);

      const refTd = document.createElement('td');
      refTd.textContent = row.receipt_no || row.ticket_id || '—';

      const actionTd = document.createElement('td');
      actionTd.textContent = row.action;

      const actorTd = document.createElement('td');
      actorTd.textContent = row.actor || '—';

      const detailsTd = document.createElement('td');
      detailsTd.className = 'audit-details';
      detailsTd.textContent = row.details || '—';

      tr.appendChild(timeTd);
      tr.appendChild(refTd);
      tr.appendChild(actionTd);
      tr.appendChild(actorTd);
      tr.appendChild(detailsTd);
      auditBody.appendChild(tr);
    });
  } finally {
    setLoading('auditLoading', false);
  }
}

function downloadExport(type, format) {
  const qs = filterQuery();
  const sep = qs ? '&' : '';
  const base = type === 'audit' ? '/api/admin/export/audit' : '/api/admin/export/bookings';
  const url = base + '?' + (qs ? qs + sep : '') + 'format=' + format;

  fetch(url, { headers: authHeaders() })
    .then(function (res) {
      if (res.status === 401) {
        logout();
        throw new Error('Session expired. Please sign in again.');
      }
      if (!res.ok) throw new Error('Export failed');
      return res.blob().then(function (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'aman-' + type + '-' + new Date().toISOString().slice(0, 10) + '.' + format;
        a.click();
        URL.revokeObjectURL(a.href);
        showAlert('Downloaded ' + type + ' (' + format.toUpperCase() + ')');
      });
    })
    .catch(function (err) { showAlert(err.message, 'error'); });
}

async function loadCalendar() {
  setLoading('calendarLoading', true);
  const statusEl = document.getElementById('calendarStatus');
  const notConfigured = document.getElementById('calendarNotConfigured');
  const urlsEl = document.getElementById('calendarUrls');
  const setupEl = document.getElementById('calendarSetup');

  statusEl.classList.add('hidden');
  notConfigured.classList.add('hidden');
  urlsEl.classList.add('hidden');
  setupEl.textContent = '';

  try {
    const data = await apiJson('/api/admin/calendar');

    if (data.googleCalendarConfigured) {
      statusEl.textContent = 'Google Calendar auto-sync is enabled — new bookings are added automatically.';
      statusEl.classList.remove('hidden');
    }

    if (data.feedConfigured && data.feedUrls) {
      document.getElementById('calWebcal').value = data.feedUrls.webcal;
      document.getElementById('calHttps').value = data.feedUrls.https;
      document.getElementById('calGoogleOpen').href = data.feedUrls.googleSubscribe;
      urlsEl.classList.remove('hidden');
    } else if (!data.googleCalendarConfigured) {
      notConfigured.classList.remove('hidden');
    }

    if (data.setup) {
      const lines = [];
      if (data.setup.oneTime) lines.push('WhatsApp (per booking): ' + data.setup.oneTime);
      if (data.setup.iphone) lines.push('iPhone: ' + data.setup.iphone);
      if (data.setup.google) lines.push('Google Calendar: ' + data.setup.google);
      setupEl.innerHTML = lines.map(function (line) {
        const idx = line.indexOf(': ');
        if (idx === -1) return line;
        return '<strong>' + line.slice(0, idx) + ':</strong> ' + line.slice(idx + 2);
      }).join('<br><br>');
    }
  } catch (err) {
    showAlert(err.message, 'error');
  } finally {
    setLoading('calendarLoading', false);
  }
}

function copyInput(id) {
  const input = document.getElementById(id);
  input.select();
  navigator.clipboard.writeText(input.value).then(function () {
    showAlert('Copied to clipboard');
  }).catch(function () {
    showAlert('Copy failed — select and copy manually', 'error');
  });
}

function switchPanel(panel) {
  activePanel = panel;
  document.querySelectorAll('.tab').forEach(function (t) {
    const isActive = t.dataset.panel === panel;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  ordersPanel.classList.toggle('hidden', panel !== 'orders');
  auditPanel.classList.toggle('hidden', panel !== 'audit');
  calendarPanel.classList.toggle('hidden', panel !== 'calendar');
  if (panel === 'calendar') loadCalendar();
}

async function refreshDashboard() {
  try {
    const tasks = [loadSummary(), loadOrders(), loadAudit()];
    if (activePanel === 'calendar') tasks.push(loadCalendar());
    await Promise.all(tasks);
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function initDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  try {
    await refreshDashboard();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

loginForm.addEventListener('submit', function (e) {
  e.preventDefault();
  loginError.classList.add('hidden');
  apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) return;

  fetch('/api/admin/stats', { headers: authHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Invalid API key');
      sessionStorage.setItem(STORAGE_KEY, apiKey);
      initDashboard();
    })
    .catch(function () {
      loginError.textContent = 'Invalid API key.';
      loginError.classList.remove('hidden');
    });
});

logoutBtn.addEventListener('click', logout);
document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
document.getElementById('applyFilters').addEventListener('click', function () {
  loadOrders().catch(function (err) { showAlert(err.message, 'error'); });
});
document.getElementById('exportBookingsCsv').addEventListener('click', function () { downloadExport('bookings', 'csv'); });
document.getElementById('exportBookingsJson').addEventListener('click', function () { downloadExport('bookings', 'json'); });
document.getElementById('exportAuditCsv').addEventListener('click', function () { downloadExport('audit', 'csv'); });
document.getElementById('exportAuditJson').addEventListener('click', function () { downloadExport('audit', 'json'); });
document.getElementById('copyWebcal').addEventListener('click', function () { copyInput('calWebcal'); });
document.getElementById('copyHttps').addEventListener('click', function () { copyInput('calHttps'); });

document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    switchPanel(tab.dataset.panel);
  });
});

if (apiKey) {
  fetch('/api/admin/stats', { headers: authHeaders() })
    .then(function (res) { if (res.ok) initDashboard(); })
    .catch(function () {});
}
