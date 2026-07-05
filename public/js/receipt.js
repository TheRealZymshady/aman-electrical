'use strict';

document.addEventListener('DOMContentLoaded', function () {
  if (window.I18n) I18n.applyTranslations();

  const form = document.getElementById('receiptForm');
  const errorEl = document.getElementById('receiptError');
  const btn = document.getElementById('receiptBtn');

  const params = new URLSearchParams(window.location.search);
  const preTicket = params.get('ticket') || '';
  const prePhone = params.get('phone') || '';

  if (preTicket) {
    document.getElementById('receiptTicket').value = preTicket.replace(/^FX-/i, 'FX-');
  }
  if (prePhone) {
    document.getElementById('receiptPhone').value = prePhone.replace(/\D/g, '').slice(-4);
  }

  if (preTicket && prePhone.length >= 4) {
    openReceipt(preTicket, prePhone.replace(/\D/g, '').slice(-4));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const ticketRaw = document.getElementById('receiptTicket').value.trim().toUpperCase();
    const ticketId = ticketRaw.startsWith('FX-') ? ticketRaw : 'FX-' + ticketRaw;
    const phoneLast4 = document.getElementById('receiptPhone').value.replace(/\D/g, '').slice(-4);
    openReceipt(ticketId, phoneLast4);
  });

  function openReceipt(ticketId, phoneLast4) {
    errorEl.style.display = 'none';
    if (phoneLast4.length !== 4) {
      showError(window.I18n ? I18n.t('receipt.phoneError') : 'Enter the last 4 digits of your phone.');
      return;
    }

    btn.disabled = true;
    const url = '/api/receipt?ticket=' + encodeURIComponent(ticketId) + '&phone=' + encodeURIComponent(phoneLast4);
    window.open(url, '_blank', 'noopener,noreferrer');
    btn.disabled = false;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
});
