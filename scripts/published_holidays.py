#!/usr/bin/env python3
"""Import attributed Calendarific forecasts, never government confirmation.

The public page mixes public holidays, optional leave and observances. The
explicit name allowlist below selects existing Bangladesh government-holiday
categories; it does not import every calendar event or infer extra dates.
Government annual notices and amendments remain authoritative.
"""
import argparse
import datetime as dt
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile
import os
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
NAME_IDS = {
    "Shab e-Barat": 'barat', "Mid-Sha'ban": 'barat',
    "Language Martyrs' Day": 'language',
    "Martyrs' Day and International Mother Language Day": 'language',
    'Jumatul Bidah': 'jumuat', "Jumu'atul-Wida": 'jumuat',
    'Shab-e-qadr': 'qadr', 'Laylat al-Qadr': 'qadr',
    'Eid ul-Fitr': 'fitr', 'Eid ul-Fitr Holiday': 'fitr', 'Eid al-Fitr': 'fitr',
    'Independence Day': 'independence',
    'Bengali New Year': 'newYear', "Bengali New Year's Day": 'newYear',
    'May Day': 'may', 'Eid al-Adha': 'adha', 'Eid al-Adha Holiday': 'adha',
    'Buddha Purnima/Vesak': 'buddha', 'Buddha Purnima / Vesak': 'buddha',
    'Ashura': 'ashura', 'Student-People Uprising Day': 'uprising',
    'July Mass Uprising Day': 'uprising', 'Eid e-Milad-un Nabi': 'milad',
    "Prophet's Birthday": 'milad', 'Janmashtami': 'janmashtami',
    'Mahanabami': 'navami', 'Durga Puja': 'dashami',
    'National Revolution and Solidarity Day': 'solidarity',
    'Victory Day': 'victory', 'Christmas Day': 'christmas',
}
REQUIRED = {'barat', 'language', 'jumuat', 'qadr', 'fitr', 'independence',
            'newYear', 'may', 'adha', 'buddha', 'ashura', 'milad',
            'janmashtami', 'navami', 'dashami', 'victory', 'christmas'}
MONTHS = {name: i for i, name in enumerate(
    ['January', 'February', 'March', 'April', 'May', 'June', 'July',
     'August', 'September', 'October', 'November', 'December'], 1)}
WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = self.cell = None
        self.title = []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == 'title':
            self.in_title = True
        if tag == 'tr':
            self.row = []
        if tag in ('td', 'th') and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag in ('td', 'th') and self.cell is not None and self.row is not None:
            self.row.append(' '.join(' '.join(self.cell).split()))
            self.cell = None
        if tag == 'tr' and self.row is not None:
            if self.row:
                self.rows.append(self.row)
            self.row = None


def parse_forecast(html, year):
    parser = TableParser()
    parser.feed(html)
    title = ' '.join(parser.title)
    if 'Bangladesh' not in title or str(year) not in title:
        raise ValueError('Source title does not identify Bangladesh and requested year')
    by_date, facts, seen, ids_seen = {}, [], set(), set()
    for cells in parser.rows:
        if len(cells) != 2 or cells == ['Holiday', 'Date']:
            continue
        name, raw_date = cells
        match = re.fullmatch(r'(\w+), (\w+) (\d{1,2}), (\d{4})', raw_date)
        if not match:
            continue
        weekday, month, day, source_year = match.groups()
        if int(source_year) != year or month not in MONTHS:
            raise ValueError('Source table contains a wrong-year or invalid date')
        date = dt.date(year, MONTHS[month], int(day))
        if WEEKDAYS[date.weekday()] != weekday:
            raise ValueError('Source weekday/date mismatch')
        token = (name, date.isoformat())
        if token in seen:
            raise ValueError('Duplicate source row')
        seen.add(token)
        normalized = re.sub(r'\s*\(Provisional\)$', '', name)
        identity = NAME_IDS.get(normalized)
        if not identity:
            continue  # Optional leave, bank-only closures and observances excluded.
        ids_seen.add(identity)
        scope = 'regional' if identity == 'chaitra' else 'national'
        entry = by_date.setdefault(date.isoformat(), {
            'date': date.isoformat(), 'ids': [], 'scope': scope,
            'status': 'projected', 'publishedNames': [],
        })
        if entry['scope'] != scope:
            raise ValueError('Regional/national collision requires manual review')
        if identity not in entry['ids']:
            entry['ids'].append(identity)
        entry['publishedNames'].append(name)
        facts.append({'date': date.isoformat(), 'name': name, 'id': identity, 'scope': scope})
    if len(seen) < 20 or len(by_date) < 17 or not REQUIRED <= ids_seen:
        raise ValueError('Empty/incomplete published forecast; existing data unchanged')
    for identity, suffix in [('language', '02-21'), ('independence', '03-26'),
                             ('newYear', '04-14'), ('may', '05-01'),
                             ('victory', '12-16'), ('christmas', '12-25')]:
        if identity not in by_date.get(f'{year}-{suffix}', {}).get('ids', []):
            raise ValueError('Fixed-day source sanity check failed')
    return sorted(by_date.values(), key=lambda h: h['date']), facts, len(seen)


def fetch_forecast(year):
    url = f'https://calendarific.com/holidays/{year}/BD'
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'})
    with urlopen(request, timeout=25) as response:
        if response.url != url:
            raise ValueError('Unexpected publisher redirect')
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError('Publisher page exceeds size limit')
    holidays, facts, count = parse_forecast(raw.decode('utf-8'), year)
    return {
        'year': year, 'status': 'projected', 'dataKind': 'published-projection',
        'retrievedOn': dt.datetime.now(dt.timezone.utc).date().isoformat(),
        'sources': [{'label': f'Calendarific Bangladesh {year} — published provisional dates', 'url': url}],
        'sourceSha256': hashlib.sha256(raw).hexdigest(), 'sourceRowCount': count,
        'selection': 'Explicit government-holiday category allowlist; optional, bank-only and observance rows excluded. Dates and extra closure days are publisher forecasts, not government confirmation.',
        'publishedRows': facts, 'holidays': holidays, 'workingDays': [],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--year', required=True, type=int, action='append')
    parser.add_argument('--destination', type=Path, default=ROOT / 'src/data/projected-holidays.json')
    parser.add_argument('--replace-all', action='store_true', help='Replace all projected years with only the successfully fetched requested years')
    args = parser.parse_args()
    if any(year < 2027 or year > 2100 for year in args.year):
        parser.error('Only future projection years 2027–2100 are allowed')
    try:
        pending = {str(year): fetch_forecast(year) for year in sorted(set(args.year))}
        existing = {} if args.replace_all else json.loads(args.destination.read_text())
        existing.update(pending)
        output = json.dumps(dict(sorted(existing.items())), ensure_ascii=False, indent=2) + '\n'
        args.destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=args.destination.parent, delete=False) as f:
            temp = Path(f.name)
            f.write(output)
        try:
            os.replace(temp, args.destination)
        finally:
            temp.unlink(missing_ok=True)
        for year, value in pending.items():
            print(f"{year}: {len(value['holidays'])} dates from {value['sourceRowCount']} publisher rows; unconfirmed. {value['sources'][0]['url']}")
        print(f'Wrote {args.destination}. Government-confirmed overrides were not changed.')
    except Exception as error:
        parser.exit(1, f'Published import failed; no data applied: {error}\n')


if __name__ == '__main__':
    main()
