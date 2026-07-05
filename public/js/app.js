'use strict';

let csrfToken = '';
let whatsappNumber = '601128731020';
let whatsappAlertsEnabled = false;
let ticketNum = '';

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
  return [
    m('header'),
    '',
    m('workOrder') + ' ' + ticketId,
    m('name') + ' ' + data.name,
    m('phone') + ' ' + data.phone,
    m('address') + ' ' + data.address,
    m('appliance') + ' ' + I18n.translateAppliance(data.appliance),
    m('date') + ' ' + formatDate(data.date),
    m('time') + ' ' + I18n.translateTimeslot(data.timeslot),
    '',
    m('problem'),
    data.issue,
  ].join('\n');
}

function showMessage(el, type, text) {
  el.textContent = '';
  el.className = type === 'error' ? 'form-alert form-alert-error' : 'form-alert form-alert-success';
  el.style.display = 'block';
  el.appendChild(document.createTextNode(text));
}

function appendReceiptLink(el, receiptUrl, receiptNo) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '12px';

  const link = document.createElement('a');
  link.className = 'wa-link';
  link.href = receiptUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = I18n.t('receipt.download');
  wrap.appendChild(link);

  if (receiptNo) {
    const ref = document.createElement('div');
    ref.style.fontSize = '13px';
    ref.style.marginTop = '6px';
    ref.style.color = 'var(--steel)';
    ref.textContent = I18n.t('receipt.number') + ' ' + receiptNo;
    wrap.appendChild(ref);
  }

  el.appendChild(wrap);
}

function showSuccessWithWhatsApp(el, ticketId, waUrl, receiptUrl, receiptNo) {
  el.textContent = '';
  el.className = 'form-alert form-alert-success';
  el.style.display = 'block';

  const line1 = document.createElement('div');
  line1.appendChild(document.createTextNode(I18n.t('alerts.savedWa')));
  const strong = document.createElement('strong');
  strong.textContent = ticketId;
  line1.appendChild(strong);
  line1.appendChild(document.createTextNode(I18n.t('alerts.waTap')));
  el.appendChild(line1);

  const link = document.createElement('a');
  link.className = 'wa-link';
  link.href = waUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = I18n.t('alerts.openWa');
  el.appendChild(link);

  if (receiptUrl) appendReceiptLink(el, receiptUrl, receiptNo);
}

function showBookingSuccess(el, ticketId, whatsappNotified, receiptUrl, receiptNo) {
  el.textContent = '';
  el.className = 'form-alert form-alert-success';
  el.style.display = 'block';

  const line1 = document.createElement('div');
  line1.appendChild(document.createTextNode(I18n.t('alerts.savedWa')));
  const strong = document.createElement('strong');
  strong.textContent = ticketId;
  line1.appendChild(strong);
  line1.appendChild(document.createTextNode(
    whatsappNotified ? I18n.t('alerts.savedTeam') : I18n.t('alerts.savedCall')
  ));
  el.appendChild(line1);

  if (!whatsappNotified) {
    const hint = document.createElement('div');
    hint.style.marginTop = '10px';
    hint.style.fontSize = '13px';
    hint.style.fontWeight = '500';
    hint.textContent = I18n.t('alerts.waHint');
    el.appendChild(hint);
  }

  if (receiptUrl) appendReceiptLink(el, receiptUrl, receiptNo);
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
    lang: I18n.getLanguage(),
  };
}

async function refreshCsrfToken() {
  const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(I18n.t('alerts.securityFail'));
  const data = await res.json();
  csrfToken = data.csrfToken;
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
    I18n.applyTranslations();
    ticketNum = ticketId;
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

initApp();
