'use strict';

(function (window) {
  const STORAGE_KEY = 'aman-lang';

  const translations = {
    en: {
      meta: { title: 'Aman Electrical', description: 'Aman Electrical — home appliance repair in Klang Valley. Book washing machine, fridge, and AC repairs online.' },
      nav: {
        home: 'Home', services: 'Services', how: 'How it works', book: 'Book a repair', track: 'Track booking',
        contact: 'Contact', bookCta: 'Book repair', langLabel: 'Language', live: 'Live',
      },
      signboard: { sub: 'Appliance Repair & Service' },
      hero: {
        eyebrow: 'Technicians available today',
        title: 'Washing machine acting up? <span>We\'re on our way.</span>',
        lead: 'Aman Electrical, led by <strong>Amir Muazzam</strong>, repairs washing machines, refrigerators, and home appliances — same-week visits, upfront pricing, no guesswork.',
        bookBtn: 'Book a repair →', waBtn: 'Chat on WhatsApp',
        waPrefill: 'Hi Aman Electrical, I need help with an appliance.',
        leadTech: 'Lead Technician', fieldTech: 'Field Technician',
      },
      panel: {
        title: "Today's queue",
        job1: 'Washing machine — not spinning', job2: 'Refrigerator — not cooling', job3: 'Dishwasher — leaking',
        inProgress: 'In progress', scheduled: 'Scheduled', fixed: 'Fixed',
      },
      showcase: {
        washTitle: 'Washing Machines', washDesc: 'Front load, top load, all major brands — fixed fast.',
        fridgeTitle: 'Refrigerators', fridgeDesc: 'Not cooling, leaking, or noisy — diagnosed and repaired on the spot.',
      },
      trust: {
        response: 'Avg. response time', repairs: 'Repairs completed', warranty: 'Repair warranty', rating: 'Customer rating',
      },
      why: {
        item1: 'Technician comes straight to your home', item2: 'No need to bring it to a shop',
        item3: '90-day warranty on every repair', item4: 'Free advice and consultation',
      },
      services: {
        tag: 'What we fix', title: "Built for the appliances that can't wait", bookTag: 'Book this repair →',
        wash: 'Washing machines', washDesc: 'Not spinning, draining, or leaking — front load and top load, all major brands.',
        fridge: 'Refrigerators', fridgeDesc: 'Not cooling, ice buildup, strange noises, or door seal issues.',
        dish: 'Dishwashers', dishDesc: "Won't drain, won't start, or leaving dishes dirty after a cycle.",
        oven: 'Ovens & stoves', ovenDesc: 'Uneven heating, ignition problems, faulty thermostats.',
        ac: 'Air conditioners', acDesc: 'Not cooling, water leaks, or unusual noise from indoor/outdoor units.',
        general: 'General diagnosis', generalDesc: "Not sure what's wrong? We'll inspect and quote before any work starts.",
        ariaWash: 'Book repair for washing machine', ariaFridge: 'Book repair for refrigerator',
        ariaDish: 'Book repair for dishwasher', ariaOven: 'Book repair for oven or stove',
        ariaAc: 'Book repair for air conditioner', ariaGeneral: 'Book general diagnosis',
      },
      how: {
        tag: 'Simple process', title: 'From broken to fixed in 3 steps',
        step1Title: 'Tell us the problem', step1Desc: 'Fill in the form or message us on WhatsApp with your appliance issue and location.',
        step2Title: 'We confirm your slot', step2Desc: 'Our team calls back within 30 minutes to schedule a convenient visit time.',
        step3Title: 'Technician comes to you', step3Desc: 'We diagnose on-site, quote upfront, and fix it — backed by a 90-day warranty.',
      },
      testimonials: {
        tag: 'Happy customers', title: 'Trusted across the Klang Valley',
        t1: '"My washing machine stopped spinning on a Sunday. Amir came the next morning and had it running in under an hour. Fair price, no hidden charges."',
        t2: '"Fridge wasn\'t cooling and we were worried about food spoiling. Quick response on WhatsApp and the technician fixed the compressor issue same day."',
        t3: '"Professional, punctual, and honest. They told me exactly what was wrong with my dishwasher before starting any work. Highly recommend Aman Electrical."',
      },
      form: {
        title: 'Request a repair', workOrder: 'WORK ORDER',
        name: 'Full name', phone: 'Phone number', appliance: 'Appliance', date: 'Preferred date',
        address: 'Service address', timeslot: 'Preferred time', issue: 'Describe the problem',
        namePh: 'Jane Tan', phonePh: '012-345 6789', addressPh: 'e.g. 12, Jalan SS15/4, Subang Jaya',
        issuePh: "e.g. Washing machine stops mid-cycle and won't spin.",
        selectAppliance: 'Select appliance', selectTime: 'Select time slot',
        submit: 'Submit booking', submitting: 'Submitting…',
        note: 'Our team gets a WhatsApp alert instantly. We usually call back within 30 minutes.',
      },
      status: {
        tag: 'Track your repair', title: 'Check booking status',
        hint: 'Enter your work order number and the last 4 digits of your phone to see the latest status.',
        ticketLabel: 'Work order #', phoneLabel: 'Phone (last 4 digits)',
        ticketPh: 'FX-1234', phonePh: '6789', check: 'Check status', checking: 'Checking…',
        workOrder: 'Work order', appliance: 'Appliance', date: 'Date', time: 'Time', status: 'Status',
        receiptLink: 'Need your receipt? Download it here →',
      },
      footer: { copy: '© 2026 Aman Electrical — Amir Muazzam', book: 'Book repair' },
      appliances: {
        wash: 'Washing machine', fridge: 'Refrigerator', dish: 'Dishwasher',
        oven: 'Oven / stove', ac: 'Air conditioner', other: 'Other',
      },
      timeslots: {
        morning: 'Morning (9am - 12pm)', afternoon: 'Afternoon (12pm - 3pm)',
        evening: 'Evening (3pm - 6pm)', flexible: 'Flexible — any time',
      },
      bookingStatus: {
        pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In progress',
        completed: 'Completed', cancelled: 'Cancelled',
      },
      alerts: {
        savedWa: '✓ Booking saved as ', waTap: ' — tap Send in WhatsApp to alert our team instantly.',
        openWa: 'Open WhatsApp again →', savedTeam: ' — WhatsApp alert sent to our team. We will call you within 30 minutes.',
        savedCall: ' — we will call you within 30 minutes.',
        waHint: 'You can also message us directly on WhatsApp using the green button.',
        submitFail: 'Submission failed. Please WhatsApp us directly.',
        lookupFail: 'Lookup failed.', securityFail: 'Security token unavailable',
      },
      receipt: {
        title: 'Download your receipt',
        hint: 'Enter your work order number and the last 4 digits of your phone to view and print your official service receipt.',
        view: 'View receipt',
        download: 'Download receipt →',
        number: 'Receipt no.',
        phoneError: 'Enter the last 4 digits of your phone.',
      },
      waMessage: {
        header: '🔧 *New Repair Request — Aman Electrical*', workOrder: '*Work Order:*',
        name: '*Name:*', phone: '*Phone:*', address: '*Address:*', appliance: '*Appliance:*',
        date: '*Preferred date:*', time: '*Preferred time:*', problem: '*Problem:*',
      },
      errors: {
        'Please enter your full name.': 'Please enter your full name.',
        'Please enter a valid Malaysian phone number.': 'Please enter a valid Malaysian phone number.',
        'Please enter a complete service address.': 'Please enter a complete service address.',
        'Please select a valid appliance.': 'Please select a valid appliance.',
        'Please choose today or a future date.': 'Please choose today or a future date.',
        'Please select a valid time slot.': 'Please select a valid time slot.',
        'Please describe the problem in at least 10 characters.': 'Please describe the problem in at least 10 characters.',
        'Unable to submit booking.': 'Unable to submit booking.',
        'No booking found with those details.': 'No booking found with those details.',
        'Security token expired. Please refresh and try again.': 'Security token expired. Please refresh and try again.',
        'Request rejected.': 'Request rejected.',
      },
    },
    ms: {
      meta: { title: 'Aman Electrical', description: 'Aman Electrical — pembaikan peralatan elektrik rumah di Lembah Klang. Tempah servis mesin basuh, peti sejuk dan penghawa dingin.' },
      nav: {
        home: 'Laman Utama', services: 'Perkhidmatan', how: 'Cara Ia Berfungsi', book: 'Tempah Servis',
        track: 'Jejak Tempahan', contact: 'Hubungi', bookCta: 'Tempah Servis', langLabel: 'Bahasa', live: 'Langsung',
      },
      signboard: { sub: 'Pembaikan & Servis Peralatan' },
      hero: {
        eyebrow: 'Juruteknik tersedia hari ini',
        title: 'Mesin basuh rosak? <span>Kami sedang dalam perjalanan.</span>',
        lead: 'Aman Electrical, diketuai oleh <strong>Amir Muazzam</strong>, membaiki mesin basuh, peti sejuk dan peralatan rumah — lawatan minggu sama, harga telus, tanpa tekaan.',
        bookBtn: 'Tempah servis →', waBtn: 'Sembang di WhatsApp',
        waPrefill: 'Hai Aman Electrical, saya perlukan bantuan dengan peralatan saya.',
        leadTech: 'Juruteknik Utama', fieldTech: 'Juruteknik Lapangan',
      },
      panel: {
        title: 'Giliran hari ini',
        job1: 'Mesin basuh — tidak berpusing', job2: 'Peti sejuk — tidak sejuk', job3: 'Mesin basuh pinggan — bocor',
        inProgress: 'Dalam proses', scheduled: 'Dijadualkan', fixed: 'Siap',
      },
      showcase: {
        washTitle: 'Mesin Basuh', washDesc: 'Muatan hadapan, muatan atas, semua jenama utama — dibaiki dengan cepat.',
        fridgeTitle: 'Peti Sejuk', fridgeDesc: 'Tidak sejuk, bocor atau bising — dikesan dan dibaiki di tempat.',
      },
      trust: {
        response: 'Masa respons purata', repairs: 'Pembaikan siap', warranty: 'Waranti pembaikan', rating: 'Penilaian pelanggan',
      },
      why: {
        item1: 'Juruteknik datang terus ke rumah anda', item2: 'Tidak perlu bawa ke kedai',
        item3: 'Waranti 90 hari untuk setiap pembaikan', item4: 'Nasihat dan konsultasi percuma',
      },
      services: {
        tag: 'Apa yang kami baiki', title: 'Untuk peralatan yang tidak boleh tunggu', bookTag: 'Tempah servis ini →',
        wash: 'Mesin basuh', washDesc: 'Tidak berpusing, tidak mengalir atau bocor — muatan hadapan dan atas, semua jenama utama.',
        fridge: 'Peti sejuk', fridgeDesc: 'Tidak sejuk, ais berlebihan, bunyi pelik atau masalah seal pintu.',
        dish: 'Mesin basuh pinggan', dishDesc: 'Tidak mengalir, tidak mula, atau pinggan masih kotor selepas kitaran.',
        oven: 'Ketuhar & dapur', ovenDesc: 'Pemanasan tidak sekata, masalah pencucuh, termostat rosak.',
        ac: 'Penghawa dingin', acDesc: 'Tidak sejuk, bocor air atau bunyi pelik dari unit dalam/luar.',
        general: 'Diagnosis umum', generalDesc: 'Tidak pasti masalahnya? Kami periksa dan beri sebut harga sebelum kerja bermula.',
        ariaWash: 'Tempah servis mesin basuh', ariaFridge: 'Tempah servis peti sejuk',
        ariaDish: 'Tempah servis mesin basuh pinggan', ariaOven: 'Tempah servis ketuhar atau dapur',
        ariaAc: 'Tempah servis penghawa dingin', ariaGeneral: 'Tempah diagnosis umum',
      },
      how: {
        tag: 'Proses mudah', title: 'Dari rosak ke siap dalam 3 langkah',
        step1Title: 'Beritahu masalah anda', step1Desc: 'Isi borang atau mesej kami di WhatsApp dengan masalah peralatan dan lokasi anda.',
        step2Title: 'Kami sahkan slot anda', step2Desc: 'Pasukan kami akan hubungi dalam 30 minit untuk jadualkan masa lawatan.',
        step3Title: 'Juruteknik datang kepada anda', step3Desc: 'Kami diagnosis di lokasi, sebut harga terus dan baiki — dengan waranti 90 hari.',
      },
      testimonials: {
        tag: 'Pelanggan gembira', title: 'Dipercayai di seluruh Lembah Klang',
        t1: '"Mesin basuh saya berhenti berpusing pada hari Ahad. Amir datang pagi esok dan siap dalam masa sejam. Harga adil, tiada caj tersembunyi."',
        t2: '"Peti sejuk tidak sejuk dan kami bimbang makanan rosak. Respons pantas di WhatsApp dan juruteknik baiki kompresor hari sama."',
        t3: '"Profesional, tepat masa dan jujur. Mereka beritahu masalah sebenar mesin basuh pinggan sebelum mula kerja. Sangat syorkan Aman Electrical."',
      },
      form: {
        title: 'Mohon pembaikan', workOrder: 'PESANAN KERJA',
        name: 'Nama penuh', phone: 'Nombor telefon', appliance: 'Peralatan', date: 'Tarikh pilihan',
        address: 'Alamat servis', timeslot: 'Masa pilihan', issue: 'Terangkan masalah',
        namePh: 'Siti Aminah', phonePh: '012-345 6789', addressPh: 'cth. 12, Jalan SS15/4, Subang Jaya',
        issuePh: 'cth. Mesin basuh berhenti pertengahan kitaran dan tidak berpusing.',
        selectAppliance: 'Pilih peralatan', selectTime: 'Pilih slot masa',
        submit: 'Hantar tempahan', submitting: 'Menghantar…',
        note: 'Pasukan kami terima amaran WhatsApp serta-merta. Biasanya kami hubungi dalam 30 minit.',
      },
      status: {
        tag: 'Jejak pembaikan anda', title: 'Semak status tempahan',
        hint: 'Masukkan nombor pesanan kerja dan 4 digit terakhir telefon untuk lihat status terkini.',
        ticketLabel: 'Pesanan kerja #', phoneLabel: 'Telefon (4 digit terakhir)',
        ticketPh: 'FX-1234', phonePh: '6789', check: 'Semak status', checking: 'Menyemak…',
        workOrder: 'Pesanan kerja', appliance: 'Peralatan', date: 'Tarikh', time: 'Masa', status: 'Status',
        receiptLink: 'Perlukan resit? Muat turun di sini →',
      },
      footer: { copy: '© 2026 Aman Electrical — Amir Muazzam', book: 'Tempah servis' },
      appliances: {
        wash: 'Mesin basuh', fridge: 'Peti sejuk', dish: 'Mesin basuh pinggan',
        oven: 'Ketuhar / dapur', ac: 'Penghawa dingin', other: 'Lain-lain',
      },
      timeslots: {
        morning: 'Pagi (9pg - 12tgh)', afternoon: 'Tengah hari (12tgh - 3ptg)',
        evening: 'Petang (3ptg - 6ptg)', flexible: 'Fleksibel — bila-bila masa',
      },
      bookingStatus: {
        pending: 'Menunggu', confirmed: 'Disahkan', in_progress: 'Dalam proses',
        completed: 'Selesai', cancelled: 'Dibatalkan',
      },
      alerts: {
        savedWa: '✓ Tempahan disimpan sebagai ', waTap: ' — tekan Hantar di WhatsApp untuk maklumkan pasukan kami.',
        openWa: 'Buka WhatsApp lagi →', savedTeam: ' — amaran WhatsApp dihantar ke pasukan kami. Kami akan hubungi anda dalam 30 minit.',
        savedCall: ' — kami akan hubungi anda dalam 30 minit.',
        waHint: 'Anda juga boleh mesej kami terus di WhatsApp menggunakan butang hijau.',
        submitFail: 'Penghantaran gagal. Sila WhatsApp kami terus.',
        lookupFail: 'Carian gagal.', securityFail: 'Token keselamatan tidak tersedia',
      },
      receipt: {
        title: 'Muat turun resit anda',
        hint: 'Masukkan nombor pesanan kerja dan 4 digit terakhir telefon anda untuk melihat dan mencetak resit rasmi.',
        view: 'Lihat resit',
        download: 'Muat turun resit →',
        number: 'No. resit',
        phoneError: 'Masukkan 4 digit terakhir telefon anda.',
      },
      waMessage: {
        header: '🔧 *Permintaan Pembaikan Baru — Aman Electrical*', workOrder: '*Pesanan Kerja:*',
        name: '*Nama:*', phone: '*Telefon:*', address: '*Alamat:*', appliance: '*Peralatan:*',
        date: '*Tarikh pilihan:*', time: '*Masa pilihan:*', problem: '*Masalah:*',
      },
      errors: {
        'Please enter your full name.': 'Sila masukkan nama penuh anda.',
        'Please enter a valid Malaysian phone number.': 'Sila masukkan nombor telefon Malaysia yang sah.',
        'Please enter a complete service address.': 'Sila masukkan alamat servis yang lengkap.',
        'Please select a valid appliance.': 'Sila pilih peralatan yang sah.',
        'Please choose today or a future date.': 'Sila pilih hari ini atau tarikh akan datang.',
        'Please select a valid time slot.': 'Sila pilih slot masa yang sah.',
        'Please describe the problem in at least 10 characters.': 'Sila terangkan masalah sekurang-kurangnya 10 aksara.',
        'Unable to submit booking.': 'Tidak dapat menghantar tempahan.',
        'No booking found with those details.': 'Tiada tempahan dijumpai dengan maklumat tersebut.',
        'Security token expired. Please refresh and try again.': 'Token keselamatan tamat. Sila muat semula dan cuba lagi.',
        'Request rejected.': 'Permintaan ditolak.',
      },
    },
  };

  function detectLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ms') return saved;
    const browser = (navigator.language || '').toLowerCase();
    return browser.startsWith('ms') ? 'ms' : 'en';
  }

  let currentLang = detectLang();

  function get(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
  }

  function t(key) {
    const val = get(translations[currentLang], key) ?? get(translations.en, key);
    return val ?? key;
  }

  function translateError(msg) {
    return translations[currentLang]?.errors?.[msg] || msg;
  }

  function translateAppliance(value) {
    const map = {
      'Washing machine': 'appliances.wash', 'Refrigerator': 'appliances.fridge',
      'Dishwasher': 'appliances.dish', 'Oven / stove': 'appliances.oven',
      'Air conditioner': 'appliances.ac', 'Other': 'appliances.other',
    };
    return map[value] ? t(map[value]) : value;
  }

  function translateTimeslot(value) {
    const normalized = String(value).replace(/[\u2013\u2014]/g, '-');
    const map = {
      'Morning (9am - 12pm)': 'timeslots.morning', 'Afternoon (12pm - 3pm)': 'timeslots.afternoon',
      'Evening (3pm - 6pm)': 'timeslots.evening', 'Flexible - any time': 'timeslots.flexible',
      'Flexible — any time': 'timeslots.flexible',
    };
    const key = map[value] || map[normalized];
    return key ? t(key) : value;
  }

  function translateBookingStatus(status) {
    return translations[currentLang]?.bookingStatus?.[status] || status.replace(/_/g, ' ');
  }

  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ms') return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'ms' ? 'ms' : 'en';
    applyTranslations();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function getLanguage() {
    return currentLang;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val != null) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key);
      if (val != null) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    document.querySelectorAll('select option[data-i18n]').forEach((opt) => {
      if (opt.value) opt.textContent = t(opt.getAttribute('data-i18n'));
    });

    const title = t('meta.title');
    if (title) document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t('meta.description');

    document.querySelectorAll('.lang-btn').forEach((btn) => {
      const active = btn.dataset.lang === currentLang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const waHero = document.getElementById('waHeroBtn');
    if (waHero) {
      waHero.href = 'https://wa.me/601128731020?text=' + encodeURIComponent(t('hero.waPrefill'));
    }
  }

  window.I18n = {
    t, setLanguage, getLanguage, applyTranslations,
    translateError, translateAppliance, translateTimeslot, translateBookingStatus,
  };

  document.documentElement.lang = currentLang === 'ms' ? 'ms' : 'en';
})(window);
