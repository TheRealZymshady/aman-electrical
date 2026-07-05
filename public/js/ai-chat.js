'use strict';

(function () {
  const MAX_PHOTOS = 3;
  const MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  let csrfToken = '';
  let whatsappNumbers = ['601128731020', '601162021508', '60187664947'];
  let aiEnabled = false;
  let isOpen = false;
  let isLoading = false;
  let photos = [];
  let lastWhatsAppMessage = '';
  let detailsOpen = true;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'ai-chat-fab';
  fab.id = 'aiChatFab';
  fab.setAttribute('aria-label', 'Ask AI');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'ai-chat-panel';
  panel.id = 'aiChatPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'aiChatTitle');
  panel.setAttribute('aria-hidden', 'true');

  panel.innerHTML = [
    '<div class="ai-chat-header">',
    '  <div>',
    '    <h2 id="aiChatTitle" data-i18n="aiChat.title">Troubleshoot assistant</h2>',
    '    <p data-i18n="aiChat.subtitle">Describe your appliance issue</p>',
    '  </div>',
    '  <button type="button" class="ai-chat-close" id="aiChatClose" aria-label="Close">',
    '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    '  </button>',
    '</div>',
    '<div class="ai-chat-messages" id="aiChatMessages" aria-live="polite"></div>',
    '<div class="ai-chat-details">',
    '  <button type="button" class="ai-chat-details-toggle" id="aiChatDetailsToggle" data-i18n="aiChat.equipmentDetails">Equipment details</button>',
    '  <div class="ai-chat-details-body open" id="aiChatDetailsBody">',
    '    <div class="ai-chat-field">',
    '      <label for="aiChatBrand" data-i18n="aiChat.brand">Brand</label>',
    '      <input type="text" id="aiChatBrand" maxlength="120" autocomplete="off" data-i18n-placeholder="aiChat.brandPh">',
    '    </div>',
    '    <div class="ai-chat-field">',
    '      <label for="aiChatSerial" data-i18n="aiChat.serial">Model / serial <span data-i18n="form.optional">(optional)</span></label>',
    '      <input type="text" id="aiChatSerial" maxlength="120" autocomplete="off" data-i18n-placeholder="aiChat.serialPh">',
    '    </div>',
    '    <div class="ai-chat-field">',
    '      <label data-i18n="aiChat.photos">Photos (up to 3)</label>',
    '      <div class="ai-chat-photos" id="aiChatPhotos"></div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div class="ai-chat-footer">',
    '  <div class="ai-chat-input-row">',
    '    <textarea id="aiChatInput" rows="1" maxlength="2000" data-i18n-placeholder="aiChat.inputPh"></textarea>',
    '    <button type="button" class="ai-chat-attach" id="aiChatAttach" aria-label="Attach photo">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    '    </button>',
    '    <button type="button" class="ai-chat-send" id="aiChatSend" aria-label="Send">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    '    </button>',
    '  </div>',
    '  <p class="ai-chat-disclaimer" data-i18n="aiChat.disclaimer">AI suggestions are general guidance, not a guaranteed diagnosis.</p>',
    '  <div class="ai-chat-wa-cta" id="aiChatWaCta" hidden>',
    '    <a href="#" class="ai-chat-wa-btn" id="aiChatWaBtn" target="_blank" rel="noopener noreferrer" data-i18n="aiChat.bookWa">Book repair on WhatsApp</a>',
    '    <div class="ai-chat-wa-alt" id="aiChatWaAlt"></div>',
    '  </div>',
    '</div>',
  ].join('');

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.multiple = true;
  fileInput.hidden = true;

  document.body.appendChild(fab);
  document.body.appendChild(panel);
  document.body.appendChild(fileInput);

  const messagesEl = document.getElementById('aiChatMessages');
  const inputEl = document.getElementById('aiChatInput');
  const brandEl = document.getElementById('aiChatBrand');
  const serialEl = document.getElementById('aiChatSerial');
  const photosEl = document.getElementById('aiChatPhotos');
  const waCtaEl = document.getElementById('aiChatWaCta');
  const waBtnEl = document.getElementById('aiChatWaBtn');
  const waAltEl = document.getElementById('aiChatWaAlt');
  const detailsToggle = document.getElementById('aiChatDetailsToggle');
  const detailsBody = document.getElementById('aiChatDetailsBody');
  const sendBtn = document.getElementById('aiChatSend');
  const attachBtn = document.getElementById('aiChatAttach');

  function t(key) {
    return window.I18n ? I18n.t(key) : key;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPhoneDisplay(num) {
    const d = String(num).replace(/\D/g, '');
    if (d.startsWith('60') && d.length >= 10) {
      return '0' + d.slice(2, 4) + '-' + d.slice(4);
    }
    return d;
  }

  function addMessage(text, role, html) {
    const el = document.createElement('div');
    el.className = 'ai-chat-msg ' + role;
    if (html) {
      el.innerHTML = html;
    } else {
      el.textContent = text;
    }
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function showLoading() {
    const el = document.createElement('div');
    el.className = 'ai-chat-msg bot';
    el.id = 'aiChatLoading';
    el.innerHTML = '<div class="ai-chat-loading"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideLoading() {
    const el = document.getElementById('aiChatLoading');
    if (el) el.remove();
  }

  function complexityLabel(level) {
    const map = {
      simple: 'aiChat.complexitySimple',
      moderate: 'aiChat.complexityModerate',
      needs_technician: 'aiChat.complexityTech',
    };
    return t(map[level] || 'aiChat.complexityModerate');
  }

  function renderDiagnosis(data) {
    const d = data.diagnosis;
    if (!d) return escapeHtml(data.fallbackText || data.message || '');

    let html = '';
    if (d.likelyCause) {
      html += '<h4>' + escapeHtml(t('aiChat.likelyCause')) + '</h4><p>' + escapeHtml(d.likelyCause) + '</p>';
    }
    if (d.explanation) {
      html += '<p>' + escapeHtml(d.explanation).replace(/\n/g, '<br>') + '</p>';
    }
    if (d.diyChecks && d.diyChecks.length) {
      html += '<h4>' + escapeHtml(t('aiChat.diyChecks')) + '</h4><ul>';
      d.diyChecks.forEach(function (c) {
        html += '<li>' + escapeHtml(c) + '</li>';
      });
      html += '</ul>';
    }
    if (d.proRepairRecommended) {
      html += '<p><strong>' + escapeHtml(t('aiChat.proRecommended')) + '</strong></p>';
    }
    if (d.complexity) {
      html += '<span class="ai-chat-complexity ' + escapeHtml(d.complexity) + '">' +
        escapeHtml(complexityLabel(d.complexity)) + '</span>';
    }
    return html;
  }

  function updateWhatsAppCta(message, numbers) {
    if (!message) {
      waCtaEl.hidden = true;
      return;
    }
    lastWhatsAppMessage = message;
    const nums = numbers && numbers.length ? numbers : whatsappNumbers;
    const primary = nums[0] || '601128731020';
    waBtnEl.href = 'https://wa.me/' + primary + '?text=' + encodeURIComponent(message);
    waCtaEl.hidden = false;

    waAltEl.innerHTML = '';
    if (nums.length > 1) {
      nums.slice(1).forEach(function (num) {
        const a = document.createElement('a');
        a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(message);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = formatPhoneDisplay(num);
        waAltEl.appendChild(a);
      });
    }
  }

  function renderPhotoThumbs() {
    photosEl.innerHTML = '';
    photos.forEach(function (photo, idx) {
      const wrap = document.createElement('div');
      wrap.className = 'ai-chat-photo-thumb';
      const img = document.createElement('img');
      img.src = photo.preview;
      img.alt = 'Photo ' + (idx + 1);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-chat-photo-remove';
      btn.textContent = '×';
      btn.setAttribute('aria-label', 'Remove photo');
      btn.addEventListener('click', function () {
        URL.revokeObjectURL(photo.preview);
        photos.splice(idx, 1);
        renderPhotoThumbs();
      });
      wrap.appendChild(img);
      wrap.appendChild(btn);
      photosEl.appendChild(wrap);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) {
        addMessage(t('aiChat.maxPhotos'), 'error');
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        addMessage(t('aiChat.invalidPhoto'), 'error');
        continue;
      }
      if (file.size > MAX_BYTES) {
        addMessage(t('aiChat.photoTooLarge'), 'error');
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      photos.push({ dataUrl: dataUrl, preview: URL.createObjectURL(file) });
    }
    renderPhotoThumbs();
  }

  async function refreshCsrf() {
    const res = await fetch('/api/csrf-token', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('csrf');
    const data = await res.json();
    csrfToken = data.csrfToken;
  }

  async function sendDiagnosis() {
    if (isLoading) return;

    const description = inputEl.value.trim();
    const brand = brandEl.value.trim();
    const modelSerial = serialEl.value.trim();

    if (!brand) {
      addMessage(t('aiChat.brandRequired'), 'error');
      detailsBody.classList.add('open');
      brandEl.focus();
      return;
    }
    if (description.length < 10) {
      addMessage(t('aiChat.descRequired'), 'error');
      inputEl.focus();
      return;
    }

    addMessage(description, 'user');
    inputEl.value = '';
    isLoading = true;
    sendBtn.disabled = true;
    attachBtn.disabled = true;
    showLoading();

    try {
      if (!csrfToken) await refreshCsrf();

      const payload = {
        description: description,
        brand: brand,
        modelSerial: modelSerial,
        lang: I18n.getLanguage(),
        images: photos.map(function (p) { return p.dataUrl; }),
      };

      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      hideLoading();

      if (res.status === 403) {
        await refreshCsrf();
        addMessage(t('errors.Security token expired. Please refresh and try again.'), 'error');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error ? (I18n.translateError ? I18n.translateError(data.error) : data.error) : t('aiChat.failed');
        addMessage(errMsg, 'error');
        return;
      }

      if (!data.aiAvailable) {
        addMessage(data.fallbackText || data.message || t('aiChat.fallback'), 'bot');
      } else {
        addMessage('', 'bot', renderDiagnosis(data));
      }

      updateWhatsAppCta(data.whatsappMessage, data.whatsappNumbers);
    } catch (_err) {
      hideLoading();
      addMessage(t('aiChat.failed'), 'error');
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      attachBtn.disabled = false;
    }
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    if (!messagesEl.children.length) {
      addMessage(t('aiChat.welcome'), 'bot');
    }
    inputEl.focus();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    if (isOpen) closePanel();
    else openPanel();
  }

  fab.addEventListener('click', togglePanel);
  document.getElementById('aiChatClose').addEventListener('click', closePanel);

  detailsToggle.addEventListener('click', function () {
    detailsOpen = !detailsOpen;
    detailsBody.classList.toggle('open', detailsOpen);
  });

  sendBtn.addEventListener('click', sendDiagnosis);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDiagnosis();
    }
  });

  attachBtn.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closePanel();
  });

  document.addEventListener('click', function (e) {
    if (!isOpen) return;
    if (panel.contains(e.target) || fab.contains(e.target)) return;
    closePanel();
  });

  document.addEventListener('langchange', function () {
    if (window.I18n) I18n.applyTranslations();
    fab.setAttribute('aria-label', t('aiChat.fabLabel'));
    if (waBtnEl && lastWhatsAppMessage) {
      updateWhatsAppCta(lastWhatsAppMessage, whatsappNumbers);
    }
  });

  async function init() {
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', t('aiChat.fabLabel'));
    if (window.I18n) I18n.applyTranslations();

    try {
      const [csrfRes, configRes] = await Promise.all([
        fetch('/api/csrf-token', { credentials: 'same-origin' }),
        fetch('/api/config', { credentials: 'same-origin' }),
      ]);
      if (csrfRes.ok) {
        const d = await csrfRes.json();
        csrfToken = d.csrfToken;
      }
      if (configRes.ok) {
        const cfg = await configRes.json();
        aiEnabled = Boolean(cfg.aiChatEnabled);
        if (cfg.whatsappRepairNumbers && cfg.whatsappRepairNumbers.length) {
          whatsappNumbers = cfg.whatsappRepairNumbers;
        } else if (cfg.whatsappNumber) {
          whatsappNumbers = [cfg.whatsappNumber];
        }
      }
    } catch (_err) {
      /* fallback defaults */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
