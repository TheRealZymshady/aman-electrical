'use strict';

(function (window) {
  const STORAGE_KEY = 'aman-lang';

  const translations = {
    en: {
      meta: { title: 'Aman Electrical', description: 'Aman Electrical — home appliance repair in Klang Valley. Book washing machine, fridge, and AC repairs online.' },
      nav: {
        home: 'Home', services: 'Services', area: 'Service area', how: 'How it works', faq: 'FAQ',
        book: 'Book', track: 'Track', contact: 'Contact', bookCta: 'Book repair',
        langLabel: 'Language', live: 'Live',
      },
      signboard: { sub: 'Appliance Repair & Service' },
      hero: {
        eyebrow: 'Klang Valley · Home visits',
        title: 'Broken appliance at home? <span>Book a repair visit.</span>',
        lead: 'Aman Electrical repairs washing machines, refrigerators, air conditioners, and more — at your doorstep across Klang Valley. Upfront quote before work starts, backed by a 90-day warranty.',
        bookBtn: 'Book a repair', waLink: 'Or message us on WhatsApp',
        waPrefill: 'Hi Aman Electrical, I need help with an appliance.',
        leadTech: 'Lead Technician', fieldTech: 'Field Technician',
      },
      trust: {
        num1: 'Same-week', label1: 'Visits',
        num2: '90-day', label2: 'Warranty',
        num3: 'Upfront', label3: 'Pricing',
        num4: 'On-site', label4: 'Repair',
      },
      area: {
        tag: 'Where we serve', title: 'Home visits across Klang Valley',
        lead: 'We come to you — no need to haul a heavy appliance to a shop. Not sure if we cover your area? WhatsApp us with your postcode.',
        kl: 'Kuala Lumpur', pj: 'Petaling Jaya', shahAlam: 'Shah Alam', subang: 'Subang Jaya',
        klang: 'Klang & Port Klang', puchong: 'Puchong & Seri Kembangan', ampang: 'Ampang & Cheras',
        kajang: 'Kajang & Bangi', note: 'Outside these areas? Message us — we may still be able to help.',
      },
      faq: {
        tag: 'Common questions', title: 'Before you book',
        q1: 'How much does a repair cost?',
        a1: 'We diagnose on-site and give you an upfront quote before any work begins. No hidden fees — you decide whether to proceed.',
        q2: 'Which areas do you cover?',
        a2: 'We serve homes across Klang Valley, including KL, Petaling Jaya, Shah Alam, Subang Jaya, Klang, Puchong, Ampang, Cheras, and Kajang. WhatsApp us if your area is not listed.',
        q3: 'What warranty do you offer?',
        a3: 'Every completed repair includes a 90-day warranty on workmanship. If the same issue returns within that period, contact us with your work order number.',
        q4: 'How soon can you visit?',
        a4: 'Most visits are scheduled within the same week. Submit the form or WhatsApp us — we typically call back within 30 minutes to confirm a date and time slot.',
        q5: 'What should I prepare before the visit?',
        a5: 'Make sure the technician can reach the appliance easily. If you know the brand and model, have that ready. A brief description of the problem helps us come prepared.',
        q6: 'What if it cannot be fixed on the first visit?',
        a6: 'Some repairs need parts that are not on hand. We will explain the options, quote any parts and labour, and arrange a follow-up visit once parts arrive.',
      },
      contact: {
        tag: 'Get in touch', title: 'Prefer to talk first?',
        lead: 'Message us on WhatsApp or call — same numbers our team uses for booking confirmations.',
        waLabel: 'WhatsApp',
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
        tag: 'After you book', title: 'What happens next',
        step1Title: 'Tell us the problem', step1Desc: 'Fill in the form or message us on WhatsApp with your appliance issue and location.',
        step2Title: 'We confirm your slot', step2Desc: 'Our team calls back within 30 minutes to schedule a convenient visit time.',
        step3Title: 'Technician comes to you', step3Desc: 'We diagnose on-site, quote upfront, and fix it — backed by a 90-day warranty.',
      },
      form: {
        tag: 'Book a visit', title: 'Request a repair', lead: 'Complete the form below — our team confirms your slot within 30 minutes.',
        eyebrow: 'Repair booking', workOrder: 'Work order',
        sectionDetails: 'Your details', sectionService: 'Service & location',
        sectionSchedule: 'Schedule', sectionProblem: 'Problem description',
        optional: '(optional)',
        name: 'Full name', phone: 'Phone number', appliance: 'Appliance', date: 'Preferred date',
        address: 'Service address', timeslot: 'Preferred time', urgency: 'How urgent is this?',
        selectUrgency: 'Select urgency', issue: 'Describe the problem',
        urgencyStandard: 'Standard — within the week', urgencySoon: 'Soon — within 2–3 days',
        urgencyEmergency: 'Urgent — today or tomorrow if possible',
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
        confirmed: 'Booking confirmed',
        savedWa: 'Your booking ', waTap: ' is saved. Tap Send in WhatsApp to alert our team.',
        openWa: 'Open WhatsApp →', savedTeam: 'Our team has been notified via WhatsApp. We will call you within 30 minutes.',
        savedCall: 'We will call you within 30 minutes to confirm your visit.',
        waHint: 'You can also reach us on WhatsApp using the green button.',
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
        date: '*Preferred date:*', time: '*Preferred time:*', urgency: '*Urgency:*', problem: '*Problem:*',
      },
      errors: {
        'Please enter your full name.': 'Please enter your full name.',
        'Please enter a valid Malaysian phone number.': 'Please enter a valid Malaysian phone number.',
        'Please enter a complete service address.': 'Please enter a complete service address.',
        'Please select a valid appliance.': 'Please select a valid appliance.',
        'Please choose today or a future date.': 'Please choose today or a future date.',
        'Please select a valid time slot.': 'Please select a valid time slot.',
        'Please describe the problem in at least 10 characters.': 'Please describe the problem in at least 10 characters.',
        'Please enter the appliance brand.': 'Please enter the appliance brand.',
        'Unable to submit booking.': 'Unable to submit booking.',
        'No booking found with those details.': 'No booking found with those details.',
        'Security token expired. Please refresh and try again.': 'Security token expired. Please refresh and try again.',
        'Request rejected.': 'Request rejected.',
      },
      aiChat: {
        fabLabel: 'Ask AI troubleshoot',
        title: 'Troubleshoot assistant',
        subtitle: 'Describe your appliance issue',
        equipmentDetails: 'Equipment details',
        brand: 'Brand',
        brandPh: 'e.g. Samsung, LG, Panasonic',
        serial: 'Model / serial',
        serialPh: 'e.g. model number on label',
        photos: 'Photos (up to 3)',
        inputPh: 'What is wrong? e.g. fridge not cooling, washer leaking…',
        disclaimer: 'AI suggestions are general guidance, not a guaranteed diagnosis.',
        bookWa: 'Book repair on WhatsApp',
        welcome: 'Hi! Tell us what is wrong with your appliance. Add the brand (required), model/serial if you know it, and photos if helpful. We can suggest likely causes and next steps.',
        likelyCause: 'Likely cause',
        diyChecks: 'Safe checks you can try',
        proRecommended: 'Professional repair is recommended for this issue.',
        complexitySimple: 'Simple fix',
        complexityModerate: 'Moderate',
        complexityTech: 'Needs a technician',
        fallback: 'Our team can help diagnose your appliance. Tap below to message us on WhatsApp with your details.',
        failed: 'Could not get a diagnosis. Please try WhatsApp instead.',
        brandRequired: 'Please enter the appliance brand in Equipment details.',
        descRequired: 'Please describe the problem (at least 10 characters).',
        maxPhotos: 'Maximum 3 photos allowed.',
        invalidPhoto: 'Use JPEG, PNG, or WebP photos only.',
        photoTooLarge: 'Each photo must be under 5MB.',
      },
    },
    ms: {
      meta: { title: 'Aman Electrical', description: 'Aman Electrical — pembaikan peralatan elektrik rumah di Lembah Klang. Tempah servis mesin basuh, peti sejuk dan penghawa dingin.' },
      nav: {
        home: 'Laman Utama', services: 'Perkhidmatan', area: 'Kawasan servis', how: 'Cara Ia Berfungsi', faq: 'Soalan Lazim',
        book: 'Tempah', track: 'Jejak', contact: 'Hubungi', bookCta: 'Tempah Servis',
        langLabel: 'Bahasa', live: 'Langsung',
      },
      signboard: { sub: 'Pembaikan & Servis Peralatan' },
      hero: {
        eyebrow: 'Lembah Klang · Lawatan ke rumah',
        title: 'Peralatan rosak di rumah? <span>Tempah lawatan pembaikan.</span>',
        lead: 'Aman Electrical membaiki mesin basuh, peti sejuk, penghawa dingin dan banyak lagi — di rumah anda di seluruh Lembah Klang. Sebut harga terus sebelum kerja bermula, dengan waranti 90 hari.',
        bookBtn: 'Tempah servis', waLink: 'Atau mesej kami di WhatsApp',
        waPrefill: 'Hai Aman Electrical, saya perlukan bantuan dengan peralatan saya.',
        leadTech: 'Juruteknik Utama', fieldTech: 'Juruteknik Lapangan',
      },
      trust: {
        num1: 'Minggu sama', label1: 'Lawatan',
        num2: '90 hari', label2: 'Waranti',
        num3: 'Telus', label3: 'Harga',
        num4: 'Di lokasi', label4: 'Pembaikan',
      },
      area: {
        tag: 'Kawasan liputan', title: 'Lawatan ke rumah di seluruh Lembah Klang',
        lead: 'Kami datang kepada anda — tidak perlu bawa peralatan berat ke kedai. Tidak pasti kawasan anda diliputi? WhatsApp kami dengan poskod anda.',
        kl: 'Kuala Lumpur', pj: 'Petaling Jaya', shahAlam: 'Shah Alam', subang: 'Subang Jaya',
        klang: 'Klang & Port Klang', puchong: 'Puchong & Seri Kembangan', ampang: 'Ampang & Cheras',
        kajang: 'Kajang & Bangi', note: 'Luar kawasan ini? Hubungi kami — kami mungkin masih boleh membantu.',
      },
      faq: {
        tag: 'Soalan lazim', title: 'Sebelum anda tempah',
        q1: 'Berapa kos pembaikan?',
        a1: 'Kami diagnosis di lokasi dan beri sebut harga terus sebelum sebarang kerja bermula. Tiada caj tersembunyi — anda tentukan sama ada mahu teruskan.',
        q2: 'Kawasan mana yang diliputi?',
        a2: 'Kami servis rumah di seluruh Lembah Klang, termasuk KL, Petaling Jaya, Shah Alam, Subang Jaya, Klang, Puchong, Ampang, Cheras dan Kajang. WhatsApp kami jika kawasan anda tidak tersenarai.',
        q3: 'Apakah waranti yang ditawarkan?',
        a3: 'Setiap pembaikan siap termasuk waranti 90 hari untuk kerja. Jika masalah sama kembali dalam tempoh itu, hubungi kami dengan nombor pesanan kerja anda.',
        q4: 'Berapa cepat lawatan boleh dijadualkan?',
        a4: 'Kebanyakan lawatan dijadualkan dalam minggu yang sama. Hantar borang atau WhatsApp kami — kami biasanya hubungi semula dalam 30 minit untuk sahkan tarikh dan slot masa.',
        q5: 'Apa yang perlu saya sediakan sebelum lawatan?',
        a5: 'Pastikan juruteknik boleh capai peralatan dengan mudah. Jika anda tahu jenama dan model, sediakan maklumat itu. Penerangan ringkas masalah membantu kami datang bersedia.',
        q6: 'Bagaimana jika tidak boleh dibaiki pada lawatan pertama?',
        a6: 'Sesetengah pembaikan perlukan alat ganti yang tidak ada di tangan. Kami akan terangkan pilihan, sebut harga alat ganti dan buruh, serta jadualkan lawatan susulan apabila alat ganti sampai.',
      },
      contact: {
        tag: 'Hubungi kami', title: 'Lebih suka bercakap dulu?',
        lead: 'Mesej kami di WhatsApp atau telefon — nombor sama yang pasukan kami guna untuk pengesahan tempahan.',
        waLabel: 'WhatsApp',
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
        tag: 'Selepas tempah', title: 'Apa yang berlaku seterusnya',
        step1Title: 'Beritahu masalah anda', step1Desc: 'Isi borang atau mesej kami di WhatsApp dengan masalah peralatan dan lokasi anda.',
        step2Title: 'Kami sahkan slot anda', step2Desc: 'Pasukan kami akan hubungi dalam 30 minit untuk jadualkan masa lawatan.',
        step3Title: 'Juruteknik datang kepada anda', step3Desc: 'Kami diagnosis di lokasi, sebut harga terus dan baiki — dengan waranti 90 hari.',
      },
      form: {
        tag: 'Tempah lawatan', title: 'Mohon pembaikan', lead: 'Lengkapkan borang di bawah — pasukan kami sahkan slot anda dalam 30 minit.',
        eyebrow: 'Tempahan pembaikan', workOrder: 'Pesanan kerja',
        sectionDetails: 'Maklumat anda', sectionService: 'Perkhidmatan & lokasi',
        sectionSchedule: 'Jadual', sectionProblem: 'Penerangan masalah',
        optional: '(pilihan)',
        name: 'Nama penuh', phone: 'Nombor telefon', appliance: 'Peralatan', date: 'Tarikh pilihan',
        address: 'Alamat servis', timeslot: 'Masa pilihan', urgency: 'Seberapa segera?',
        selectUrgency: 'Pilih kecemasan', issue: 'Terangkan masalah',
        urgencyStandard: 'Biasa — dalam minggu ini', urgencySoon: 'Segera — dalam 2–3 hari',
        urgencyEmergency: 'Mendesak — hari ini atau esok jika boleh',
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
        confirmed: 'Tempahan disahkan',
        savedWa: 'Tempahan anda ', waTap: ' telah disimpan. Tekan Hantar di WhatsApp untuk maklumkan pasukan kami.',
        openWa: 'Buka WhatsApp →', savedTeam: 'Pasukan kami telah dimaklumkan melalui WhatsApp. Kami akan hubungi anda dalam 30 minit.',
        savedCall: 'Kami akan hubungi anda dalam 30 minit untuk sahkan lawatan.',
        waHint: 'Anda juga boleh hubungi kami di WhatsApp melalui butang hijau.',
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
        date: '*Tarikh pilihan:*', time: '*Masa pilihan:*', urgency: '*Kecemasan:*', problem: '*Masalah:*',
      },
      errors: {
        'Please enter your full name.': 'Sila masukkan nama penuh anda.',
        'Please enter a valid Malaysian phone number.': 'Sila masukkan nombor telefon Malaysia yang sah.',
        'Please enter a complete service address.': 'Sila masukkan alamat servis yang lengkap.',
        'Please select a valid appliance.': 'Sila pilih peralatan yang sah.',
        'Please choose today or a future date.': 'Sila pilih hari ini atau tarikh akan datang.',
        'Please select a valid time slot.': 'Sila pilih slot masa yang sah.',
        'Please describe the problem in at least 10 characters.': 'Sila terangkan masalah sekurang-kurangnya 10 aksara.',
        'Please enter the appliance brand.': 'Sila masukkan jenama peralatan.',
        'Unable to submit booking.': 'Tidak dapat menghantar tempahan.',
        'No booking found with those details.': 'Tiada tempahan dijumpai dengan maklumat tersebut.',
        'Security token expired. Please refresh and try again.': 'Token keselamatan tamat. Sila muat semula dan cuba lagi.',
        'Request rejected.': 'Permintaan ditolak.',
      },
      aiChat: {
        fabLabel: 'Tanya AI troubleshoot',
        title: 'Pembantu troubleshoot',
        subtitle: 'Terangkan masalah peralatan anda',
        equipmentDetails: 'Butiran peralatan',
        brand: 'Jenama',
        brandPh: 'cth. Samsung, LG, Panasonic',
        serial: 'Model / siri',
        serialPh: 'cth. nombor model pada label',
        photos: 'Foto (sehingga 3)',
        inputPh: 'Apa masalahnya? cth. peti sejuk tidak sejuk, mesin basuh bocor…',
        disclaimer: 'Cadangan AI adalah panduan umum, bukan diagnosis yang dijamin.',
        bookWa: 'Tempah pembaikan di WhatsApp',
        welcome: 'Hai! Beritahu masalah peralatan anda. Tambah jenama (wajib), model/siri jika ada, dan foto jika membantu. Kami boleh cadangkan punca dan langkah seterusnya.',
        likelyCause: 'Kemungkinan punca',
        diyChecks: 'Semakan selamat yang boleh dicuba',
        proRecommended: 'Pembaikan profesional disyorkan untuk masalah ini.',
        complexitySimple: 'Pembaikan mudah',
        complexityModerate: 'Sederhana',
        complexityTech: 'Perlu juruteknik',
        fallback: 'Pasukan kami boleh bantu diagnosis peralatan anda. Tekan di bawah untuk WhatsApp dengan butiran anda.',
        failed: 'Tidak dapat diagnosis. Sila cuba WhatsApp.',
        brandRequired: 'Sila masukkan jenama peralatan dalam Butiran peralatan.',
        descRequired: 'Sila terangkan masalah (sekurang-kurangnya 10 aksara).',
        maxPhotos: 'Maksimum 3 foto sahaja.',
        invalidPhoto: 'Gunakan foto JPEG, PNG, atau WebP sahaja.',
        photoTooLarge: 'Setiap foto mesti kurang daripada 5MB.',
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

  function translateUrgency(value) {
    const map = { standard: 'form.urgencyStandard', soon: 'form.urgencySoon', emergency: 'form.urgencyEmergency' };
    return map[value] ? t(map[value]) : '';
  }

  function translateBookingStatus(value) {
    const map = {
      pending: 'bookingStatus.pending', confirmed: 'bookingStatus.confirmed',
      in_progress: 'bookingStatus.in_progress', completed: 'bookingStatus.completed',
      cancelled: 'bookingStatus.cancelled',
    };
    return map[value] ? t(map[value]) : value;
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
    translateError, translateAppliance, translateTimeslot, translateUrgency, translateBookingStatus,
  };

  document.documentElement.lang = currentLang === 'ms' ? 'ms' : 'en';
})(window);
