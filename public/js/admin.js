'use strict';

const STORAGE_KEY = 'aman-admin-key';
let apiKey = sessionStorage.getItem(STORAGE_KEY) || '';

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const globalAlert = document.getElementById('globalAlert');
const statsGrid = document.getElementById('statsGrid');
const ordersBody = document.getElementById('ordersBody');
const auditBody = document.getElementById('auditBody');
const ordersPanel = document.getElementById('ordersPanel');
const auditPanel = document.getElementById('auditPanel');

function showAlert(msg, type) {
  globalAlert.textContent = msg;
  globalAlert.className = 'alert alert-' + (type || 'success');
  globalAlert.classList.remove('hidden');
  setTimeout(function () { globalAlert.classList.add('hidden'); }, 4000);
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

function logout() {
  apiKey = '';
  sessionStorage.removeItem(STORAGE_KEY);
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'Z').toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status) {
  const span = document.createElement('span');
  span.className = 'badge badge-' + status;
  span.textContent = status.replace(/_/g, ' ');
  return span;
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

async function loadStats() {
  const res = await apiFetch('/api/admin/stats');
  const data = await res.json();
  statsGrid.innerHTML = '';

  const totalCard = document.createElement('div');
  totalCard.className = 'stat-card';
  totalCard.innerHTML = '<strong>' + data.total + '</strong><span>Total orders</span>';
  statsGrid.appendChild(totalCard);

  (data.byStatus || []).forEach(function (row) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = '<strong>' + row.total + '</strong><span>' + row.status.replace(/_/g, ' ') + '</span>';
    statsGrid.appendChild(card);
  });
}

async function loadOrders() {
  const qs = filterQuery();
  const res = await apiFetch('/api/admin/bookings' + (qs ? '?' + qs : ''));
  const data = await res.json();
  ordersBody.innerHTML = '';

  if (!data.bookings.length) {
    ordersBody.innerHTML = '<tr><td colspan="8">No orders found.</td></tr>';
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
      opt.textContent = s.replace(/_/g, ' ');
      if (s === b.status) opt.selected = true;
      select.appendChild(opt);
    });
    statusTd.appendChild(select);

    const actionsTd = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-sm';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function () {
      updateStatus(b.ticket_id, select.value);
    });

    const receiptBtn = document.createElement('a');
    receiptBtn.className = 'btn btn-ghost btn-sm';
    receiptBtn.textContent = 'Receipt';
    receiptBtn.href = '/api/admin/receipt/' + encodeURIComponent(b.ticket_id);
    receiptBtn.target = '_blank';
    receiptBtn.rel = 'noopener noreferrer';

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
}

async function updateStatus(ticketId, status) {
  try {
    const res = await apiFetch('/api/admin/bookings/status', {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ ticketId, status }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Update failed');
    showAlert('Updated ' + ticketId + ' → ' + status);
    loadStats();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function loadAudit() {
  const res = await apiFetch('/api/admin/audit?limit=100');
  const data = await res.json();
  auditBody.innerHTML = '';

  if (!data.audit.length) {
    auditBody.innerHTML = '<tr><td colspan="5">No audit entries yet.</td></tr>';
    return;
  }

  data.audit.forEach(function (row) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + formatDate(row.created_at) + '</td>' +
      '<td>' + (row.receipt_no || row.ticket_id || '—') + '</td>' +
      '<td>' + row.action + '</td>' +
      '<td>' + (row.actor || '—') + '</td>' +
      '<td style="font-size:12px;color:#6b6560">' + (row.details || '—') + '</td>';
    auditBody.appendChild(tr);
  });
}

function downloadExport(type, format) {
  const qs = filterQuery();
  const sep = qs ? '&' : '';
  const base = type === 'audit' ? '/api/admin/export/audit' : '/api/admin/export/bookings';
  const url = base + '?' + (qs ? qs + sep : '') + 'format=' + format;

  fetch(url, { headers: authHeaders() })
    .then(function (res) {
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

async function initDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  try {
    await Promise.all([loadStats(), loadOrders(), loadAudit()]);
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
      loginError.textContent = 'Invalid API key. Check ADMIN_API_KEY in your server .env file.';
      loginError.classList.remove('hidden');
    });
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshBtn').addEventListener('click', function () {
  loadStats();
  loadOrders();
  loadAudit();
});
document.getElementById('applyFilters').addEventListener('click', function () {
  loadOrders();
});
document.getElementById('exportBookingsCsv').addEventListener('click', function () { downloadExport('bookings', 'csv'); });
document.getElementById('exportBookingsJson').addEventListener('click', function () { downloadExport('bookings', 'json'); });
document.getElementById('exportAuditCsv').addEventListener('click', function () { downloadExport('audit', 'csv'); });
document.getElementById('exportAuditJson').addEventListener('click', function () { downloadExport('audit', 'json'); });

document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');
    const panel = tab.dataset.panel;
    ordersPanel.classList.toggle('hidden', panel !== 'orders');
    auditPanel.classList.toggle('hidden', panel !== 'audit');
  });
});

if (apiKey) {
  fetch('/api/admin/stats', { headers: authHeaders() })
    .then(function (res) { if (res.ok) initDashboard(); })
    .catch(function () {});
}
