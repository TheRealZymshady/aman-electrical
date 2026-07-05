import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'public' / 'index.html'
html = path.read_text(encoding='utf-8')

html = re.sub(
    r'<div class="logo">\s*(<img[^>]+>)\s*Aman Electrical\s*</div>',
    r'<a href="#home" class="logo" aria-label="Aman Electrical — Home">\1</a>',
    html,
    count=1,
)

def fix_img(m):
    attrs = m.group(2)
    if 'class=' not in attrs:
        attrs += ' class="logo-img"'
    if 'alt=' not in attrs:
        attrs += ' alt="Aman Electrical"'
    return m.group(1) + attrs + m.group(3)

html = re.sub(
    r'(<a href="#home" class="logo"[^>]*>\s*<img)([^>]*)(>)',
    fix_img,
    html,
    count=1,
)

html = re.sub(
    r'\s*<!-- ============== SIGNBOARD ============== -->\s*<div id="home" class="signboard">.*?</div>\s*',
    '\n',
    html,
    flags=re.S,
    count=1,
)

html = re.sub(r'\s*<div class="signboard-sub"[^>]*>.*?</div>\s*', '\n', html, flags=re.S, count=1)

html = html.replace(
    '<div class="eyebrow fade-in"><span class="blink"></span> Technicians available today</div>',
    '<p class="hero-tagline" data-i18n="signboard.sub">Appliance Repair &amp; Service</p>\n        <div class="eyebrow fade-in"><span class="blink"></span> <span data-i18n="hero.eyebrow">Technicians available today</span></div>',
    1,
)

html = html.replace('<section class="hero">', '<section id="home" class="hero">', 1)

path.write_text(html, encoding='utf-8')
print('done:', 'signboard-text' not in html, 'href="#home" class="logo"' in html)
