'use strict';

let csrfToken = '';
let whatsappNumber = '601128731020';
let whatsappAlertsEnabled = false;
let ticketNum = '';
let trackedStatus = null;
let sseClient = null;

const liveIndicator = document.getElementById('liveIndicator');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

function getHeaderOffset() {
  const header = document.querySelector('header');
  return header ? header.offsetHeight + 8 : 72;
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function closeNav() {
  navLinks.classList.remove('open');
  navToggle.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}

navToggle.addEventListener('click', function () {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(function (link) {
  link.addEventListener('click', function (event) {
    const hash = link.getAttribute('href');
    if (hash && hash.charAt(0) === '#' && hash.length > 1) {
      event.preventDefault();
      closeNav();
      scrollToSection(hash.slice(1));
      history.pushState(null, '', hash);
    } else {
      closeNav();
    }
  });
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && navLinks.classList.contains('open')) closeNav();
});

document.addEventListener('click', function (event) {
  if (!navLinks.classList.contains('open')) return;
  if (navLinks.contains(event.target) || navToggle.contains(event.target)) return;
  closeNav();
});

document.querySelectorAll('.lang-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    I18n.setLanguage(btn.dataset.lang);
  });
});

const dateInput = document.getElementById('date');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

const applianceSelect = document.getElementById('appliance');

function bookAppliance(appliance) {
  applianceSelect.value = appliance;
  scrollToSection('book');
  document.getElementById('name').focus({ preventScroll: true });
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
  const locale = I18n.getLanguage() === 'ms' ? 'ms-MY' : 'en-MY';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function buildWhatsAppMessage(data, ticketId) {
  const m = function (key) { return I18n.t('waMessage.' + key); };
  const lines = [
    m('header'),
    '',
    m('workOrder') + ' ' + ticketId,
    m('name') + ' ' + data.name,
    m('phone') + ' ' + data.phone,
    m('address') + ' ' + data.address,
    m('appliance') + ' ' + I18n.translateAppliance(data.appliance),
    m('date') + ' ' + formatDate(data.date),
    m('time') + ' ' + I18n.translateTimeslot(data.timeslot),
  ];
  if (data.urgency) lines.push(m('urgency') + ' ' + I18n.translateUrgency(data.urgency));
  lines.push('', m('problem'), data.issue);
  return lines.join('\n');
}

function hideConfirmPanel() {
  confirmMsg.hidden = true;
  confirmMsg.className = 'confirm-panel';
  confirmMsg.textContent = '';
}

function showMessage(el, type, text) {
  el.hidden = false;
  el.className = 'confirm-panel' + (type === 'error' ? ' is-error' : '');
  el.textContent = '';
  el.appendChild(document.createTextNode(text));
}

function buildReceiptPanel(ticketId, bodyText, actionsEl) {
  const panel = document.createDocumentFragment();

  const header = document.createElement('div');
  header.className = 'receipt-header';
  const check = document.createElement('span');
  check.className = 'receipt-check';
  check.setAttribute('aria-hidden', 'true');
  check.textContent = '✓';
  const title = document.createElement('h3');
  title.className = 'receipt-title';
  title.textContent = I18n.t('alerts.confirmed');
  header.appendChild(check);
  header.appendChild(title);
  panel.appendChild(header);

  const idEl = document.createElement('p');
  idEl.className = 'receipt-id';
  idEl.textContent = ticketId;
  panel.appendChild(idEl);

  const body = document.createElement('p');
  body.className = 'receipt-body';
  body.textContent = bodyText;
  panel.appendChild(body);

  if (actionsEl) {
    const actions = document.createElement('div');
    actions.className = 'receipt-actions';
    actions.appendChild(actionsEl);
    panel.appendChild(actions);
  }

  return panel;
}

function appendReceiptLink(parent, receiptUrl, receiptNo) {
  const link = document.createElement('a');
  link.className = 'receipt-link';
  link.href = receiptUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = I18n.t('receipt.download');
  parent.appendChild(link);

  if (receiptNo) {
    const ref = document.createElement('p');
    ref.className = 'receipt-meta';
    ref.textContent = I18n.t('receipt.number') + ' ' + receiptNo;
    parent.appendChild(ref);
  }
}

function showSuccessWithWhatsApp(el, ticketId, waUrl, receiptUrl, receiptNo) {
  el.hidden = false;
  el.className = 'confirm-panel';

  const actions = document.createElement('div');
  const waLink = document.createElement('a');
  waLink.className = 'wa-link';
  waLink.href = waUrl;
  waLink.target = '_blank';
  waLink.rel = 'noopener noreferrer';
  waLink.textContent = I18n.t('alerts.openWa');
  actions.appendChild(waLink);
  if (receiptUrl) appendReceiptLink(actions, receiptUrl, receiptNo);

  el.textContent = '';
  el.appendChild(buildReceiptPanel(
    ticketId,
    I18n.t('alerts.savedWa') + ticketId + ' ' + I18n.t('alerts.waTap'),
    actions
  ));
}

function showBookingSuccess(el, ticketId, whatsappNotified, receiptUrl, receiptNo) {
  el.hidden = false;
  el.className = 'confirm-panel';

  let bodyText = I18n.t('alerts.savedWa') + ticketId + ' ' +
    (whatsappNotified ? I18n.t('alerts.savedTeam') : I18n.t('alerts.savedCall'));
  if (!whatsappNotified) bodyText += ' ' + I18n.t('alerts.waHint');

  const actions = receiptUrl ? document.createElement('div') : null;
  if (actions && receiptUrl) appendReceiptLink(actions, receiptUrl, receiptNo);

  el.textContent = '';
  el.appendChild(buildReceiptPanel(ticketId, bodyText, actions));
}

function getFormData() {
  const urgencyKey = document.getElementById('urgency').value;
  let issue = document.getElementById('issue').value.trim();
  if (urgencyKey) {
    const urgencyLabel = I18n.translateUrgency(urgencyKey);
    if (urgencyLabel) issue = '[' + urgencyLabel + ']\n' + issue;
  }
  return {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    appliance: document.getElementById('appliance').value,
    preferredDate: document.getElementById('date').value,
    timeslot: document.getElementById('timeslot').value,
    issue: issue,
    urgency: urgencyKey,
    _website: document.getElementById('_website').value,
    lang: I18n.getLanguage(),
  };
}

async function refreshCsrfToken() {
  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(I18n.t('alerts.securityFail'));
  const data = await res.json();
  csrfToken = data.csrfToken;
}

function setLiveConnected(connected) {
  if (!liveIndicator) return;
  liveIndicator.classList.toggle('hidden', !connected);
}

function renderStatusResult(body) {
  statusResult.className = 'status-result status-result-ok';
  statusResult.style.display = 'block';
  statusResult.innerHTML = '';
  const rows = [
    [I18n.t('status.workOrder'), body.ticketId],
    [I18n.t('receipt.number'), body.receiptNo || '—'],
    [I18n.t('status.appliance'), I18n.translateAppliance(body.appliance)],
    [I18n.t('status.date'), formatDate(body.preferredDate)],
    [I18n.t('status.time'), I18n.translateTimeslot(body.timeslot)],
    [I18n.t('status.status'), I18n.translateBookingStatus(body.status)],
  ];
  rows.forEach(function (row) {
    const p = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = row[0] + ': ';
    p.appendChild(label);
    p.appendChild(document.createTextNode(row[1]));
    statusResult.appendChild(p);
  });

  if (body.receiptUrl) {
    const p = document.createElement('p');
    p.style.marginTop = '12px';
    const link = document.createElement('a');
    link.className = 'wa-link';
    link.href = body.receiptUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = I18n.t('receipt.download');
    p.appendChild(link);
    statusResult.appendChild(p);
  }
}

async function refreshTrackedStatus() {
  if (!trackedStatus) return;
  try {
    if (!csrfToken) await refreshCsrfToken();
    const res = await fetch('/api/bookings/status', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        ticketId: trackedStatus.ticketId,
        phoneLast4: trackedStatus.phoneLast4,
      }),
    });
    const body = await res.json().catch(function () { return {}; });
    if (!res.ok) return;
    renderStatusResult(body);
  } catch (_err) {
    // keep last known status on transient failures
  }
}

function connectPublicSse() {
  if (sseClient) sseClient.close();
  sseClient = createSseClient('/api/events', {
    onOpen: function () { setLiveConnected(true); },
    onClose: function () { setLiveConnected(false); },
    events: {
      booking_status_updated: function (data) {
        if (!trackedStatus || data.ticketId !== trackedStatus.ticketId) return;
        refreshTrackedStatus();
      },
    },
  });
}

async function initApp() {
  I18n.applyTranslations();

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

  connectPublicSse();
}

const form = document.getElementById('repairForm');
const confirmMsg = document.getElementById('confirmMsg');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  hideConfirmPanel();

  const payload = getFormData();
  const clientData = {
    name: payload.name,
    phone: payload.phone,
    address: payload.address,
    appliance: payload.appliance,
    date: payload.preferredDate,
    timeslot: payload.timeslot,
    urgency: payload.urgency,
    issue: payload.issue,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = I18n.t('form.submitting');

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
      throw new Error(I18n.translateError(body.error) || I18n.translateError('Unable to submit booking.'));
    }

    const ticketId = body.ticketId;
    const receiptUrl = body.receiptUrl || '';
    const receiptNo = body.receiptNo || '';
    document.getElementById('ticketNum').textContent = ticketId.slice(3);

    if (body.whatsappNotified) {
      showBookingSuccess(confirmMsg, ticketId, true, receiptUrl, receiptNo);
    } else {
      const waUrl = 'https://wa.me/' + whatsappNumber + '?text=' +
        encodeURIComponent(buildWhatsAppMessage(clientData, ticketId));
      showSuccessWithWhatsApp(confirmMsg, ticketId, waUrl, receiptUrl, receiptNo);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    form.reset();
    dateInput.setAttribute('min', today);
    document.getElementById('ticketNum').textContent = '—';
    I18n.applyTranslations();
    ticketNum = '';
    confirmMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showMessage(confirmMsg, 'error', err.message || I18n.t('alerts.submitFail'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = I18n.t('form.submit');
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
    statusBtn.textContent = I18n.t('status.checking');

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
        throw new Error(I18n.translateError(body.error) || I18n.t('alerts.lookupFail'));
      }

      trackedStatus = { ticketId: body.ticketId, phoneLast4: phoneLast4 };
      renderStatusResult(body);
    } catch (err) {
      statusResult.className = 'status-result status-result-error';
      statusResult.style.display = 'block';
      statusResult.textContent = err.message;
    } finally {
      statusBtn.disabled = false;
      statusBtn.textContent = I18n.t('status.check');
    }
  });
}

document.addEventListener('langchange', function () {
  submitBtn.textContent = I18n.t('form.submit');
  statusBtn.textContent = I18n.t('status.check');
});

const animatedEls = document.querySelectorAll('.fade-in, .scale-in');
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

animatedEls.forEach(function (el) { observer.observe(el); });

const stickyCta = document.getElementById('stickyCta');
const heroSection = document.getElementById('home');
const bookSection = document.getElementById('book');

function updateStickyCta() {
  if (!stickyCta || !heroSection || !bookSection) return;
  const heroBottom = heroSection.getBoundingClientRect().bottom;
  const bookTop = bookSection.getBoundingClientRect().top;
  const show = heroBottom < 0 && bookTop > window.innerHeight * 0.35;
  stickyCta.hidden = !show;
  document.body.classList.toggle('sticky-cta-visible', show);
}

window.addEventListener('scroll', updateStickyCta, { passive: true });
window.addEventListener('resize', updateStickyCta, { passive: true });
updateStickyCta();

if (stickyCta) {
  stickyCta.querySelector('a').addEventListener('click', function (event) {
    event.preventDefault();
    scrollToSection('book');
  });
}

initApp();
