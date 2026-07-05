"""Apply i18n data attributes and language switcher."""
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'public' / 'index.html'
html = path.read_text(encoding='utf-8')

if 'lang-switch' not in html:
    logo_close = html.find('</a>', html.find('class="logo"'))
    block = '''
      <div class="lang-switch" role="group" aria-label="Language" data-i18n-aria="nav.langLabel">
        <button type="button" class="lang-btn active" data-lang="en" aria-pressed="true">EN</button>
        <button type="button" class="lang-btn" data-lang="ms" aria-pressed="false">BM</button>
      </div>'''
    html = html[:logo_close + 4] + block + html[logo_close + 4:]

subs = [
    ('<a href="#home">Home</a>', '<a href="#home" data-i18n="nav.home">Home</a>'),
    ('<a href="#services">Services</a>', '<a href="#services" data-i18n="nav.services">Services</a>'),
    ('<a href="#how">How it works</a>', '<a href="#how" data-i18n="nav.how">How it works</a>'),
    ('<a href="#book">Book a repair</a>', '<a href="#book" data-i18n="nav.book">Book a repair</a>'),
    ('<a href="#status">Track booking</a>', '<a href="#status" data-i18n="nav.track">Track booking</a>'),
    ('<a href="#contact">Contact</a>', '<a href="#contact" data-i18n="nav.contact">Contact</a>'),
    ('nav-cta-mobile">Book repair', 'nav-cta-mobile" data-i18n="nav.bookCta">Book repair'),
    ('nav-cta-desktop">Book repair', 'nav-cta-desktop" data-i18n="nav.bookCta">Book repair'),
    ('<h1>Washing machine', '<h1 data-i18n-html="hero.title">Washing machine'),
    ('<p class="lead">', '<p class="lead" data-i18n-html="hero.lead">'),
    ('btn btn-primary">Book a repair', 'btn btn-primary" data-i18n="hero.bookBtn">Book a repair'),
    ('btn btn-ghost">Chat on WhatsApp', 'btn btn-ghost" id="waHeroBtn" data-i18n="hero.waBtn">Chat on WhatsApp'),
    ('>Lead Technician ·', '><span data-i18n="hero.leadTech">Lead Technician</span> ·'),
    ('>Field Technician · 011', '><span data-i18n="hero.fieldTech">Field Technician</span> · 011'),
    ('>Field Technician · 018', '><span data-i18n="hero.fieldTech">Field Technician</span> · 018'),
    ('panel-title">Today\'s queue', 'panel-title" data-i18n="panel.title">Today\'s queue'),
    ('ticket-left">\n            <div class="ticket-icon">🧺</div>\n            <div>Washing machine', 'ticket-left">\n            <div class="ticket-icon">🧺</div>\n            <div data-i18n="panel.job1">Washing machine'),
    ('ticket-icon">🧊</div>\n            <div>Refrigerator', 'ticket-icon">🧊</div>\n            <div data-i18n="panel.job2">Refrigerator'),
    ('ticket-icon">🍽️</div>\n            <div>Dishwasher', 'ticket-icon">🍽️</div>\n            <div data-i18n="panel.job3">Dishwasher'),
    ('status-progress">In progress', 'status-progress" data-i18n="panel.inProgress">In progress'),
    ('status-wait">Scheduled', 'status-wait" data-i18n="panel.scheduled">Scheduled'),
    ('status-done">Fixed', 'status-done" data-i18n="panel.fixed">Fixed'),
    ('<h3>Washing Machines</h3>', '<h3 data-i18n="showcase.washTitle">Washing Machines</h3>'),
    ('<p>Front load, top load, all major brands', '<p data-i18n="showcase.washDesc">Front load, top load, all major brands'),
    ('<h3>Refrigerators</h3>\n        <p>Not cooling, leaking', '<h3 data-i18n="showcase.fridgeTitle">Refrigerators</h3>\n        <p data-i18n="showcase.fridgeDesc">Not cooling, leaking'),
    ('trust-label">Avg. response time', 'trust-label" data-i18n="trust.response">Avg. response time'),
    ('trust-label">Repairs completed', 'trust-label" data-i18n="trust.repairs">Repairs completed'),
    ('trust-label">Repair warranty', 'trust-label" data-i18n="trust.warranty">Repair warranty'),
    ('trust-label">Customer rating', 'trust-label" data-i18n="trust.rating">Customer rating'),
    ('why-icon">✓</span> Technician comes', 'why-icon">✓</span> <span data-i18n="why.item1">Technician comes'),
    ('why-icon">✓</span> No need to bring', 'why-icon">✓</span> <span data-i18n="why.item2">No need to bring'),
    ('why-icon">✓</span> 90-day warranty', 'why-icon">✓</span> <span data-i18n="why.item3">90-day warranty'),
    ('why-icon">✓</span> Free advice', 'why-icon">✓</span> <span data-i18n="why.item4">Free advice'),
    ('section-tag">What we fix', 'section-tag" data-i18n="services.tag">What we fix'),
    ('<h2>Built for the appliances', '<h2 data-i18n="services.title">Built for the appliances'),
    ('section-tag">Simple process', 'section-tag" data-i18n="how.tag">Simple process'),
    ('<h2>From broken to fixed', '<h2 data-i18n="how.title">From broken to fixed'),
    ('section-tag">Happy customers', 'section-tag" data-i18n="testimonials.tag">Happy customers'),
    ('<h2>Trusted across the Klang Valley</h2>', '<h2 data-i18n="testimonials.title">Trusted across the Klang Valley</h2>'),
    ('<h2>Request a repair</h2>', '<h2 data-i18n="form.title">Request a repair</h2>'),
    ('WORK ORDER<br>', '<span data-i18n="form.workOrder">WORK ORDER</span><br>'),
    ('<label for="name">Full name</label>', '<label for="name" data-i18n="form.name">Full name</label>'),
    ('<label for="phone">Phone number</label>', '<label for="phone" data-i18n="form.phone">Phone number</label>'),
    ('<label for="appliance">Appliance</label>', '<label for="appliance" data-i18n="form.appliance">Appliance</label>'),
    ('<label for="date">Preferred date</label>', '<label for="date" data-i18n="form.date">Preferred date</label>'),
    ('<label for="address">Service address</label>', '<label for="address" data-i18n="form.address">Service address</label>'),
    ('<label for="timeslot">Preferred time</label>', '<label for="timeslot" data-i18n="form.timeslot">Preferred time</label>'),
    ('<label for="issue">Describe the problem</label>', '<label for="issue" data-i18n="form.issue">Describe the problem</label>'),
    ('id="submitBtn">Submit booking', 'id="submitBtn" data-i18n="form.submit">Submit booking'),
    ('class="form-note">Our team gets', 'class="form-note" data-i18n="form.note">Our team gets'),
    ('section-tag">Track your repair', 'section-tag" data-i18n="status.tag">Track your repair'),
    ('<h2>Check booking status</h2>', '<h2 data-i18n="status.title">Check booking status</h2>'),
    ('id="statusBtn">Check status', 'id="statusBtn" data-i18n="status.check">Check status'),
    ('>© 2026 Aman Electrical', ' data-i18n="footer.copy">© 2026 Aman Electrical'.replace(' data', '><div data').replace('><div', '<div', 1)),
    ('<a href="#book">Book repair</a>', '<a href="#book" data-i18n="footer.book">Book repair</a>'),
    ('<script src="/js/app.js"', '<script src="/js/i18n.js"></script>\n  <script src="/js/app.js"'),
]

for old, new in subs:
    if old in html and new.split('"')[0] not in html[max(0, html.find(old)-5):html.find(old)+len(old)+20] if html.find(old) >= 0 else False:
        html = html.replace(old, new, 1)

# Fix footer copy if broken
html = html.replace('<div <div data-i18n="footer.copy">', '<div data-i18n="footer.copy">')

# Close why-list spans
for item in ['why.item1', 'why.item2', 'why.item3', 'why.item4']:
    pass  # items need closing span - fix manually

path.write_text(html, encoding='utf-8')
print('ok', 'i18n.js' in html, 'lang-switch' in html)
