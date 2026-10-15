#!/usr/bin/env python3
"""Maintainer-only Bangladesh gazette download/review pipeline. Never auto-confirms."""
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, quote
import datetime as dt
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import time
import urllib.request

ATTACHMENT_HOST = 'objectstorage.ap-dcc-gazipur-1.oraclecloud15.com'
ATTACHMENT_PREFIX = '/n/axvjbnqprylg/b/V2Ministry/o/office-mopa/'
MAX_BYTES = 25 * 1024 * 1024


def safe_url(url, attachment=False):
    p = urlsplit(url)
    gov = p.hostname and (p.hostname == 'gov.bd' or p.hostname.endswith('.gov.bd'))
    storage = attachment and p.hostname == ATTACHMENT_HOST and p.path.startswith(ATTACHMENT_PREFIX)
    if p.scheme != 'https' or p.username or p.password or p.port not in (None, 443) or not (gov or storage):
        raise ValueError('Only HTTPS Bangladesh government URLs (or notice-linked MOPA storage) are allowed: ' + url)
    return url


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 5
    max_repeats = 2

    def __init__(self, attachment):
        self.attachment = attachment

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe_url(newurl, self.attachment)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url, attachment=False, timeout=25):
    safe_url(url, attachment)
    url = quote(url, safe=':/?&=%+#')
    opener = urllib.request.build_opener(SafeRedirect(attachment))
    deadline = time.monotonic() + timeout
    with opener.open(urllib.request.Request(url, headers={'User-Agent': 'BangladeshCalendarMaintainer/1.0'}), timeout=timeout) as response:
        safe_url(response.url, attachment)
        chunks = []
        size = 0
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError('Download deadline exceeded')
            chunk = response.read(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_BYTES:
                raise ValueError('Download exceeds 25 MiB limit')
            chunks.append(chunk)
        return b''.join(chunks), response.url


def require_pdf(data):
    if not data.startswith(b'%PDF-'):
        raise ValueError('Attachment is not a PDF (possibly HTML error/login page); nothing applied')


def extract_text(path):
    if shutil.which('pdftotext'):
        cmd = ['pdftotext', '-layout', str(path), '-']
        engine = 'pdftotext -layout'
    else:
        cmd = [sys.executable, '-c', 'from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text(extraction_mode="layout") or "" for p in PdfReader(sys.argv[1]).pages))', str(path)]
        engine = 'pypdf layout'
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=60, check=True)
        return result.stdout.decode('utf-8', errors='replace'), engine
    except (subprocess.SubprocessError, OSError) as exc:
        return '', 'extraction failed: install pdftotext or python3 -m pip install pypdf; ' + str(exc)


def ocr_text(path):
    """Optional bounded Bangla+English OCR. Output remains untrusted review aid."""
    import tempfile
    if not all(shutil.which(tool) for tool in ('pdftoppm', 'tesseract', 'pdfinfo')):
        raise ValueError('OCR requires poppler-utils and tesseract with ben + eng languages; install tesseract-ocr-ben')
    info = subprocess.run(['pdfinfo', str(path)], capture_output=True, text=True, check=True, timeout=15)
    match = re.search(r'^Pages:\s*(\d+)', info.stdout, re.M)
    if not match or not 1 <= int(match[1]) <= 20:
        raise ValueError('OCR accepts at most 20 PDF pages; review this document separately')
    with tempfile.TemporaryDirectory(prefix='holiday-ocr-') as folder:
        prefix = str(pathlib.Path(folder) / 'page')
        subprocess.run(['pdftoppm', '-r', '150', '-png', str(path), prefix], capture_output=True, check=True, timeout=90)
        pages = []
        for image in sorted(pathlib.Path(folder).glob('page-*.png')):
            result = subprocess.run(['tesseract', str(image), 'stdout', '-l', 'ben+eng'], capture_output=True, check=True, timeout=45)
            pages.append(result.stdout.decode('utf-8', errors='replace'))
        return '\n\f\n'.join(pages), 'tesseract ben+eng OCR (150 dpi; HUMAN REVIEW REQUIRED)'


def make_draft(year, pdf, pdf_url, notice_url, notice_text, output, extractor=extract_text):
    require_pdf(pdf)
    digest = hashlib.sha256(pdf).hexdigest()
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    folder = output / str(year) / (stamp + '-' + digest[:12])
    folder.mkdir(parents=True, exist_ok=False)
    pdf_path = folder / 'annual.pdf'
    pdf_path.write_bytes(pdf)
    text, engine = extractor(pdf_path)
    (folder / 'extracted.txt').write_text(text, encoding='utf-8')
    (folder / 'date-candidates.json').write_text(json.dumps(date_candidates(text, year), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (folder / 'notice.txt').write_text(notice_text, encoding='utf-8')
    readable = len(re.findall(r'[\u0980-\u09ff]', text)) >= 40
    state = 'manual-table-review' if readable else ('ocr-required' if len(text.strip()) < 80 else 'legacy-font-or-unreadable-text')
    metadata = {'year': year, 'downloadedOn': dt.datetime.now(dt.timezone.utc).isoformat(),
                'pdfUrl': pdf_url, 'noticeUrl': notice_url, 'sha256': digest,
                'bytes': len(pdf), 'extractor': engine, 'extractionStatus': state,
                'sourceYearMatched': bool(re.search(r'(?<!\d)' + str(year) + r'(?!\d)', (notice_text + '\n' + text).translate(DIGITS)))}
    (folder / 'metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sources = [{'url': url, 'label': f'{year} government annual holiday source'} for url in dict.fromkeys([notice_url, pdf_url]) if url and urlsplit(url).hostname != ATTACHMENT_HOST]
    draft = {'year': year, 'status': 'draft', 'verifiedOn': '', 'sources': sources,
             'completeAnnualList': False, 'reviewedBy': '', 'holidays': [], 'workingDays': [],
             'reviewNotes': 'Compare the complete PDF visually. Include general + executive-order dates, merge same-day names, exclude optional leave. Review amendments. No parser output is trusted.',
             'archive': {'sha256': digest}}
    target = folder / 'review.json'
    target.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return target

DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
MONTHS = ['January জানুয়ারি জানুয়ারি', 'February ফেব্রুয়ারি ফেব্রুয়ারি', 'March মার্চ',
          'April এপ্রিল', 'May মে', 'June জুন', 'July জুলাই', 'August আগস্ট',
          'September সেপ্টেম্বর', 'October অক্টোবর', 'November নভেম্বর', 'December ডিসেম্বর']


def date_candidates(text, year):
    """Date hints only: optional-leave/footnote dates may appear."""
    result = {}
    for raw in text.splitlines():
        line = raw.translate(DIGITS)
        dates = []
        for month, aliases in enumerate(MONTHS, 1):
            pattern = r'(?<!\d)(\d{1,2})\s*(' + '|'.join(aliases.split()) + r')\s*[,/-]?\s*' + str(year) + r'(?!\d)'
            for match in re.finditer(pattern, line, re.I):
                dates.append(f'{year}-{month:02d}-{int(match[1]):02d}')
        dates.extend(re.findall(r'(?<!\d)' + str(year) + r'-\d{2}-\d{2}(?!\d)', line))
        for date in dates:
            try:
                dt.date.fromisoformat(date)
            except ValueError:
                continue
            result.setdefault(date, {'date': date, 'rawLine': raw.strip(), 'requiresReview': True})
    return [result[d] for d in sorted(result)]


def iso_date(value, year=None):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Expected full ISO Gregorian date')
    parsed = dt.date.fromisoformat(value)
    if year is not None and parsed.year != year:
        raise ValueError('Date is outside requested year: ' + value)
    return parsed


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('Duplicate JSON key: ' + key)
            result[key] = value
        return result
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique)


def apply_review(review, destination, year, attest):
    import os
    import tempfile
    if not attest:
        raise ValueError('Apply requires --attest-reviewed: you personally checked the complete annual gazette')
    data = read_json(review)
    metadata = read_json(review.parent / 'metadata.json')
    if not isinstance(data, dict) or not isinstance(metadata, dict):
        raise ValueError('Review and archive metadata must be JSON objects')
    if type(data.get('year')) is not int or data['year'] != year or metadata.get('year') != year:
        raise ValueError('Review/archive year does not match --year')
    if data.get('completeAnnualList') is not True or not nonempty(data.get('reviewedBy')):
        raise ValueError('A named reviewer and completeAnnualList: true are required')
    verified = iso_date(data.get('verifiedOn'))
    if verified > dt.datetime.now(dt.timezone.utc).date():
        raise ValueError('Review date cannot be in the future')
    pdf = (review.parent / 'annual.pdf').read_bytes()
    require_pdf(pdf)
    digest = hashlib.sha256(pdf).hexdigest()
    if digest != metadata.get('sha256') or digest != data.get('archive', {}).get('sha256'):
        raise ValueError('Archived PDF SHA-256 does not match; re-download/review')
    source_text = (review.parent / 'notice.txt').read_text(encoding='utf-8') + '\n' + (review.parent / 'extracted.txt').read_text(encoding='utf-8')
    if metadata.get('sourceYearMatched') is not True or not re.search(r'(?<!\d)' + str(year) + r'(?!\d)', source_text.translate(DIGITS)):
        raise ValueError('Target year not found in source; obtain a matching annual notice/PDF')
    sources = data.get('sources')
    if not isinstance(sources, list) or not sources:
        raise ValueError('Government sources are required')
    official_notice = metadata.get('noticeUrl')
    if official_notice:
        safe_url(official_notice)
    source_urls = []
    for source in sources:
        if not isinstance(source, dict) or not nonempty(source.get('label')):
            raise ValueError('Every source needs a nonempty label')
        url = source.get('url')
        if not nonempty(url):
            raise ValueError('Every source needs a URL')
        safe_url(url)
        source_urls.append(url)
    safe_url(metadata.get('pdfUrl'), attachment=bool(official_notice))
    required = [u for u in (official_notice, metadata.get('pdfUrl')) if u and urlsplit(u).hostname != ATTACHMENT_HOST]
    if not required or not all(u in source_urls for u in required):
        raise ValueError('Reviewed sources must retain the archived notice/PDF URLs')
    holidays = data.get('holidays')
    if not isinstance(holidays, list) or len(holidays) < 10:
        raise ValueError('Annual list is empty/implausibly short (minimum 10 distinct dates)')
    seen = set()
    normalized = []
    for row in holidays:
        if not isinstance(row, dict):
            raise ValueError('Holiday must be an object')
        if 'status' in row and row['status'] != 'official':
            raise ValueError('Holiday status must be official when specified')
        date = row.get('date')
        iso_date(date, year)
        if date in seen:
            raise ValueError('Duplicate holiday date: ' + date)
        seen.add(date)
        if row.get('scope') not in ('national', 'regional'):
            raise ValueError('Scope must be national or regional')
        names = row.get('names')
        if not isinstance(names, list) or not names or not all(isinstance(n, dict) and nonempty(n.get('en')) and nonempty(n.get('bn')) and re.search(r'[\u0980-\u09ff]', n['bn']) for n in names):
            raise ValueError('Each holiday needs nonempty English and Bangla names')
        normalized.append({'date': date, 'names': [{'en': n['en'].strip(), 'bn': n['bn'].strip()} for n in names], 'scope': row['scope']})
    if len({date[5:7] for date in seen}) < 6:
        raise ValueError('Annual list must span at least six months; partial lists are not accepted')
    working = data.get('workingDays')
    if not isinstance(working, list):
        raise ValueError('workingDays must be an explicit array of ISO dates')
    work_seen = set()
    for date in working:
        iso_date(date, year)
        if date in work_seen or date in seen:
            raise ValueError('Duplicate/conflicting working-day date')
        work_seen.add(date)
    record = {'year': year, 'status': 'official', 'verifiedOn': data['verifiedOn'], 'sources': sources,
              'completeAnnualList': True, 'reviewedBy': data['reviewedBy'].strip(),
              'holidays': sorted(normalized, key=lambda r: r['date']), 'workingDays': sorted(working)}
    lock = destination.with_name(destination.name + '.lock')
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    temporary = None
    try:
        existing = read_json(destination) if destination.exists() else {}
        if not isinstance(existing, dict):
            raise ValueError('Existing confirmed data must be a year mapping; refusing overwrite')
        existing[str(year)] = record
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=destination.parent, prefix='.holidays-', delete=False) as handle:
            temporary = pathlib.Path(handle.name)
            json.dump(existing, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
        lock.unlink()
    if read_json(destination).get(str(year)) != record:
        raise RuntimeError('Post-write verification failed')
    return record

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.rows = []
        self.links = []
        self.text = []
        self.row = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = {'text': [], 'links': []}
        if tag == 'a':
            href = dict(attrs).get('href')
            if href:
                self.links.append(href)
                if self.row is not None:
                    self.row['links'].append(href)

    def handle_data(self, data):
        self.text.append(data)
        if self.row is not None:
            self.row['text'].append(data)

    def handle_endtag(self, tag):
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def annual_notices(html, base, year):
    found = []
    for row in Page(html).rows:
        text = ' '.join(row['text']).translate(DIGITS)
        if str(year) not in text or 'ছুটির তালিকা' not in text:
            continue
        for href in row['links']:
            url = urljoin(base, href)
            if '/pages/public-holiday/' in url and not url.lower().endswith('.pdf'):
                found.append(url)
    return list(dict.fromkeys(found))


def discover(year, notice_url=None, pdf_url=None, fetcher=fetch):
    """Bounded discovery against actual MOPA HTML tables, never guessed filenames."""
    errors = []
    if not notice_url and not pdf_url:
        listings = ['https://mopa.gov.bd/pages/public-holiday/'] + [
            f'https://mopa.gov.bd/pages/public-holiday?archived=true&page={page}&page_size=50' for page in range(1, 4)]
        for listing in listings:
            try:
                raw, final = fetcher(listing)
                notices = annual_notices(raw.decode('utf-8'), final, year)
                if len(notices) > 1:
                    raise ValueError('Multiple annual notices; choose one explicitly with --notice-url')
                if notices:
                    notice_url = notices[0]
                    break
            except (OSError, UnicodeError) as exc:
                errors.append(str(exc))
        if not notice_url:
            raise ValueError(f'No {year} annual notice discovered. It may not be published or the site changed. Use --notice-url or --pdf-url after checking MOPA. ' + '; '.join(errors))
    title = ''
    if notice_url:
        safe_url(notice_url)
        raw, notice_url = fetcher(notice_url)
        html = raw.decode('utf-8')
        headings = re.findall(r'<h2\b[^>]*>(.*?)</h2>', html, re.S | re.I)
        title = ' '.join(' '.join(Page(h).text) for h in headings)
        if not title:
            raise ValueError('Notice title not found; verify site structure or use government --pdf-url')
        if not re.search(r'(?<!\d)' + str(year) + r'(?!\d)', title.translate(DIGITS)) or 'ছুটির তালিকা' not in title:
            raise ValueError('Notice heading does not identify the requested annual holiday list')
        links = list(dict.fromkeys(urljoin(notice_url, href.strip()) for href in Page(html).links if urlsplit(href.strip()).path.lower().endswith('.pdf')))
        if pdf_url and pdf_url not in links:
            # A direct government gazette can be supplied alongside the notice; storage MUST be linked.
            safe_url(pdf_url)
        elif not pdf_url:
            if len(links) != 1:
                raise ValueError('No unique PDF attachment; use --pdf-url with the verified government PDF')
            pdf_url = links[0]
        safe_url(pdf_url, attachment=pdf_url in links)
    else:
        safe_url(pdf_url)
    return pdf_url, notice_url, title


def main(argv=None):
    import argparse
    root = pathlib.Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description='Download Bangladesh annual gazette for HUMAN REVIEW; never automatically confirm holidays.')
    parser.add_argument('command', nargs='?', choices=['update', 'apply'], default='update')
    parser.add_argument('--year', type=int, required=True)
    parser.add_argument('--notice-url', help='Verified annual MOPA notice URL')
    parser.add_argument('--pdf-url', help='Verified government PDF URL (or attachment linked by --notice-url)')
    parser.add_argument('--ocr', action='store_true', help='Use installed tesseract ben+eng for scanned/legacy PDFs; output still needs review')
    parser.add_argument('--output-dir', type=pathlib.Path, default=root / 'scripts/holiday-sources')
    parser.add_argument('--review', type=pathlib.Path, help='Reviewed review.json kept alongside archive metadata and PDF')
    parser.add_argument('--destination', type=pathlib.Path, default=root / 'src/data/confirmed-holidays.json')
    parser.add_argument('--attest-reviewed', action='store_true', help='I personally checked the complete annual list, scopes, names, notes and amendments')
    args = parser.parse_args(argv)
    if not 2020 <= args.year <= 2100:
        parser.error('--year must be between 2020 and 2100')
    try:
        if args.command == 'apply':
            if not args.review:
                parser.error('apply requires --review PATH')
            result = apply_review(args.review, args.destination, args.year, args.attest_reviewed)
            print(f'Applied reviewed official {args.year}: {len(result["holidays"])} dates to {args.destination}; other years retained.')
            return 0
        if args.attest_reviewed or args.review:
            parser.error('--review/--attest-reviewed only belong to the apply command')
        pdf_url, notice_url, title = discover(args.year, args.notice_url, args.pdf_url)
        print('Notice:', notice_url or '(direct government PDF; source year must occur in extracted text)')
        print('PDF:', pdf_url)
        pdf, final_pdf_url = fetch(pdf_url, attachment=bool(notice_url))
        target = make_draft(args.year, pdf, final_pdf_url, notice_url, title, args.output_dir, extractor=ocr_text if args.ocr else extract_text)
        metadata = read_json(target.parent / 'metadata.json')
        print(f'Downloaded {metadata["bytes"]} bytes; SHA-256 {metadata["sha256"]}')
        print(f'Extraction: {metadata["extractor"]}; {metadata["extractionStatus"]}')
        print('Review draft:', target)
        print('No official data changed. Read annual.pdf, extracted.txt, date-candidates.json and HOLIDAY_UPDATES.md.')
        if metadata['extractionStatus'] != 'manual-table-review':
            print('WARNING: OCR/legacy-font review required. Empty/unreliable text is NOT a holiday list.')
        return 0
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, subprocess.SubprocessError) as exc:
        print('ERROR: ' + str(exc) + '\nOfficial data was not replaced by a draft.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
