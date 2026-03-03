"""Utility script to verify canonical navigation and concierge assets."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'index.html',
    'about/index.html',
    'services/index.html',
    'contact/index.html',
    'order/index.html',
    'demo.html',
    'blog/index.html',
    'blog/post-template.html',
    'privacy/index.html',
    'refunds/index.html',
    'terms/index.html',
    'liability/index.html',
    'thank-you/index.html',
    '404/index.html',
    '404.html',
    'admin.html'
]
NAV_LINKS = [
    'href="/"',
    'href="/services"',
    'href="/demo"',
    'href="/blog"',
    'href="/order"',
    'href="/contact"'
]

report = []
for rel in FILES:
    path = ROOT / rel
    html = path.read_text(encoding='utf-8')
    missing = [link.split('"')[1] for link in NAV_LINKS if link not in html]
    report.append({
        'file': rel,
        'missing_nav': missing,
        'has_concierge_css': '/concierge-widget-new.css' in html,
        'has_concierge_js': '/concierge-widget-new.js' in html,
        'has_cookie': '/cookie-consent.js' in html,
        'has_gtag': 'googletagmanager.com/gtag/js' in html
    })

print(json.dumps(report, indent=2))
