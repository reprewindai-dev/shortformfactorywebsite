"""Sync header, footer, and concierge assets across static HTML files."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / 'index.html'
FILES = [
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

HEADER_PATTERN = re.compile(r"\s{0,4}<header class=\"header\".*?</header>", re.DOTALL)
FOOTER_PATTERN = re.compile(r"\s{0,4}<footer class=\"footer\".*?</footer>", re.DOTALL)

REQUIRED_SCRIPTS = [
    '<script src="/main.js" defer></script>',
    '<script src="/concierge-widget-new.js" defer></script>'
]

def extract_canonical(section_name: str, pattern: re.Pattern) -> str:
    source = HOME.read_text(encoding='utf-8')
    match = pattern.search(source)
    if not match:
        raise ValueError(f"Unable to find canonical {section_name} in {HOME}")
    return match.group(0).strip()

CANONICAL_HEADER = extract_canonical('header', HEADER_PATTERN)
CANONICAL_FOOTER = extract_canonical('footer', FOOTER_PATTERN)

def ensure_section(content: str, pattern: re.Pattern, replacement: str, label: str, path: Path) -> tuple[str, bool]:
    if pattern.search(content) is None:
        print(f"[warn] {label} missing in {path}")
        return content, False
    updated, count = pattern.subn('\n' + replacement + '\n', content, count=1)
    if count == 0:
        print(f"[warn] {label} not replaced in {path}")
        return content, False
    return updated, True

def ensure_scripts(content: str) -> tuple[str, bool]:
    updated = False
    for script_tag in REQUIRED_SCRIPTS:
        if script_tag not in content:
            content = content.replace('</body>', f"  {script_tag}\n</body>")
            updated = True
    return content, updated

def sync_file(path: Path) -> bool:
    content = path.read_text(encoding='utf-8')
    original = content

    content, header_updated = ensure_section(content, HEADER_PATTERN, CANONICAL_HEADER, 'header', path)
    content, footer_updated = ensure_section(content, FOOTER_PATTERN, CANONICAL_FOOTER, 'footer', path)
    content, scripts_updated = ensure_scripts(content)

    if content != original:
        path.write_text(content, encoding='utf-8')
        print(f"[ok] Synced layout in {path}")
        return True

    if not (header_updated and footer_updated):
        return False

    if scripts_updated:
        path.write_text(content, encoding='utf-8')
        print(f"[ok] Added concierge scripts in {path}")
        return True

    print(f"[skip] Already up to date: {path}")
    return False

def main():
    updated = 0
    for rel in FILES:
        path = ROOT / rel
        if not path.exists():
            print(f"[missing] {rel}")
            continue
        if sync_file(path):
            updated += 1
    print(f"Done. Updated {updated} files.")

if __name__ == '__main__':
    main()
