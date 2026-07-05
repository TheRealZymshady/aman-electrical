'use strict';

let csrfToken = '';
let whatsappNumber = '601128731020';
let whatsappAlertsEnabled = false;
let ticketNum = '';

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', function () {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(function (link) {
  link.addEventListener('click', function () {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const dateInput = document.getElementById('date');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

const applianceSelect = document.getElementById('appliance');

function bookAppliance(appliance) {
  applianceSelect.value = appliance;
  document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('name').focus();
}

document.querySelectorAll('.service-card[data-appliance]').forEach(function (card) {
  function handleSelect() { bookAppliance(card.dataset.appliance); }
  card.addEventListener('click', handleSelect);
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  });
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-MY', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function buildWhatsAppMessage(data, ticketId) {
  return [
    '🔧 *New Repair Request — Aman Electrical*',
    '',
    '*Work Order:* ' + ticketId,
    '*Name:* ' + data.name,
    '*Phone:* ' + data.phone,
    '*Address:* ' + data.address,
    '*Appliance:* ' + data.appliance,
    '*Preferred date:* ' + formatDate(data.date),
    '*Preferred time:* ' + data.timeslot,
    '',
    '*Problem:*',
    data.issue,
  ].join('\n');
}

function showMessage(el, type, text) {
  el.textContent = '';
  el.className = type === 'error' ? 'form-alert form-alert-error' : 'form-alert form-alert-success';
  el.style.display = 'block';
  el.appendChild(document.createTextNode(text));
}

function showSuccessWithWhatsApp(el, ticketId, waUrl) {
  el.textContent = '';
  el.className = 'form-alert form-alert-success';
  el.style.display = 'block';

  const line1 = document.createElement('div');
  line1.appendChild(document.createTextNode('✓ Booking saved as '));
  const strong = document.createElement('strong');
  strong.textContent = ticketId;
  line1.appendChild(strong);
  line1.appendChild(document.createTextNode(' — tap Send in WhatsApp to alert our team instantly.'));
  el.appendChild(line1);

  const link = document.createElement('a');
  link.className = 'wa-link';
  link.href = waUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open WhatsApp again →';
  el.appendChild(link);
}

function showBookingSuccess(el, ticketId, whatsappNotified) {
  el.textContent = '';
  el.className = 'form-alert form-alert-success';
  el.style.display = 'block';

  const line1 = document.createElement('div');
  line1.appendChild(document.createTextNode('✓ Booking saved as '));
  const strong = document.createElement('strong');
  strong.textContent = ticketId;
  line1.appendChild(strong);

  if (whatsappNotified) {
    line1.appendChild(document.createTextNode(' — WhatsApp alert sent to our team. We will call you within 30 minutes.'));
  } else {
    line1.appendChild(document.createTextNode(' — we will call you within 30 minutes.'));
  }
  el.appendChild(line1);

  if (!whatsappNotified) {
    const hint = document.createElement('div');
    hint.style.marginTop = '10px';
    hint.style.fontSize = '13px';
    hint.style.fontWeight = '500';
    hint.textContent = 'You can also message us directly on WhatsApp using the green button.';
    el.appendChild(hint);
  }
}

function getFormData() {
  return {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    appliance: document.getElementById('appliance').value,
    preferredDate: document.getElementById('date').value,
    timeslot: document.getElementById('timeslot').value,
    issue: document.getElementById('issue').value.trim(),
    _website: document.getElementById('_website').value,
  };
}

async function refreshCsrfToken() {
  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Security token unavailable');
  const data = await res.json();
  csrfToken = data.csrfToken;
}

async function initApp() {
  try {
    const [csrfRes, configRes] = await Promise.all([
      fetch('/api/csrf-token', { credentials: 'same-origin' }),
      fetch('/api/config', { credentials: 'same-origin' }),
    ]);
    if (csrfRes.ok) {
      const csrfData = await csrfRes.json();
      csrfToken = csrfData.csrfToken;
    }
    if (configRes.ok) {
      const config = await configRes.json();
      if (config.whatsappNumber) whatsappNumber = config.whatsappNumber;
      whatsappAlertsEnabled = Boolean(config.whatsappAlerts);
    }
  } catch (_err) {
    console.warn('Could not load security token; form submission may fail.');
  }

  ticketNum = 'FX-' + String(Math.floor(1000 + Math.random() * 9000));
  document.getElementById('ticketNum').textContent = ticketNum.slice(3);
}

const form = document.getElementById('repairForm');
const confirmMsg = document.getElementById('confirmMsg');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  confirmMsg.style.display = 'none';

  const payload = getFormData();
  const clientData = {
    name: payload.name,
    phone: payload.phone,
    address: payload.address,
    appliance: payload.appliance,
    date: payload.preferredDate,
    timeslot: payload.timeslot,
    issue: payload.issue,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  try {
    if (!csrfToken) await refreshCsrfToken();

    const res = await fetch('/api/bookings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(function () { return {}; });

    if (!res.ok) {
      if (res.status === 403) await refreshCsrfToken();
      throw new Error(body.error || 'Unable to submit booking.');
    }

    const ticketId = body.ticketId;
    document.getElementById('ticketNum').textContent = ticketId.slice(3);

    if (body.whatsappNotified) {
      showBookingSuccess(confirmMsg, ticketId, true);
    } else if (body.whatsappUrl) {
      showSuccessWithWhatsApp(confirmMsg, ticketId, body.whatsappUrl);
      window.open(body.whatsappUrl, '_blank', 'noopener,noreferrer');
    } else {
      showBookingSuccess(confirmMsg, ticketId, false);
    }

    form.reset();
    dateInput.setAttribute('min', today);
    ticketNum = ticketId;
  } catch (err) {
    showMessage(confirmMsg, 'error', err.message || 'Submission failed. Please WhatsApp us directly.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit booking';
  }
});

const statusForm = document.getElementById('statusForm');
const statusResult = document.getElementById('statusResult');
const statusBtn = document.getElementById('statusBtn');

if (statusForm) {
  statusForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    statusResult.style.display = 'none';
    statusBtn.disabled = true;
    statusBtn.textContent = 'Checking…';

    try {
      if (!csrfToken) await refreshCsrfToken();

      const ticketRaw = document.getElementById('statusTicket').value.trim().toUpperCase();
      const ticketId = ticketRaw.startsWith('FX-') ? ticketRaw : 'FX-' + ticketRaw;
      const phoneLast4 = document.getElementById('statusPhone').value.replace(/\D/g, '');

      const res = await fetch('/api/bookings/status', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ ticketId, phoneLast4 }),
      });

      const body = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        if (res.status === 403) await refreshCsrfToken();
        throw new Error(body.error || 'Lookup failed.');
      }

      statusResult.className = 'status-result status-result-ok';
      statusResult.style.display = 'block';
      statusResult.innerHTML = '';
      const rows = [
        ['Work order', body.ticketId],
        ['Appliance', body.appliance],
        ['Date', formatDate(body.preferredDate)],
        ['Time', body.timeslot],
        ['Status', body.status.replace('_', ' ')],
      ];
      rows.forEach(function (row) {
        const p = document.createElement('p');
        const label = document.createElement('strong');
        label.textContent = row[0] + ': ';
        p.appendChild(label);
        p.appendChild(document.createTextNode(row[1]));
        statusResult.appendChild(p);
      });
    } catch (err) {
      statusResult.className = 'status-result status-result-error';
      statusResult.style.display = 'block';
      statusResult.textContent = err.message;
    } finally {
      statusBtn.disabled = false;
      statusBtn.textContent = 'Check status';
    }
  });
}

const animatedEls = document.querySelectorAll('.fade-in, .scale-in');
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.15 });

animatedEls.forEach(function (el) { observer.observe(el); });

initApp();
