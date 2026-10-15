"""Offline importer tests. Synthetic HTML wraps factual published rows."""
import datetime as dt
import html
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from published_holidays import ROOT, parse_forecast, main

DATA = json.loads((ROOT / 'src/data/projected-holidays.json').read_text())


def fixture(year=2027, extra=()):
    rows = [(r['name'], r['date']) for r in DATA[str(year)]['publishedRows']] + list(extra)
    cells = []
    for name, iso in rows:
        date = dt.date.fromisoformat(iso)
        value = f'{date:%A}, {date:%B} {date.day}, {date.year}'
        cells.append(f'<tr><td><a>{html.escape(name)}</a></td><td>{value}</td></tr>')
    return f'<title>Bangladesh Public Holidays in {year} - synthetic fixture</title><table>' + ''.join(cells) + '</table>'


class PublishedImporterTests(unittest.TestCase):
    def test_factual_rows_reproduce_selected_dates_without_local_calculations(self):
        for year in range(2027, 2031):
            actual, facts, count = parse_forecast(fixture(year), year)
            self.assertEqual(actual, DATA[str(year)]['holidays'])
            self.assertEqual(facts, DATA[str(year)]['publishedRows'])
            self.assertGreaterEqual(count, 20)

    def test_optional_observance_and_bank_events_do_not_become_public_holidays(self):
        extras = [('Halloween', '2027-10-31'), ("Valentine's Day", '2027-02-14'),
                  ('Buddha Purnima Holiday', '2027-05-19'),
                  ('Durga Puja Holiday', '2027-10-07'),
                  ('July 1 Bank Holiday', '2027-07-01'), ('Chaitra Sankranti', '2027-04-13')]
        actual, facts, count = parse_forecast(fixture(extra=extras), 2027)
        self.assertEqual(actual, DATA['2027']['holidays'])
        self.assertEqual(facts, DATA['2027']['publishedRows'])
        self.assertEqual(count, len(DATA['2027']['publishedRows']) + len(extras))

    def test_bad_country_year_weekday_duplicate_or_empty_page_fails_closed(self):
        valid = fixture()
        bad = [valid.replace('Bangladesh Public', 'Othercountry Public'),
               valid.replace('in 2027', 'in 2028'),
               valid.replace('Sunday, January 24, 2027', 'Monday, January 24, 2027'),
               fixture(extra=[('Shab e-Barat (Provisional)', '2027-01-24')]),
               '<title>Bangladesh Public Holidays in 2031</title><p>0 holidays</p>']
        for candidate in bad:
            with self.assertRaises(ValueError):
                parse_forecast(candidate, 2027)

    def test_multiyear_fetch_failure_preserves_destination_bytes(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'scripts') as folder:
            dest = Path(folder) / 'projections.json'
            before = b'{"retained": "unchanged"}\n'
            dest.write_bytes(before)
            with patch('sys.argv', ['published_holidays.py', '--year', '2027', '--year', '2031', '--destination', str(dest), '--replace-all']), patch('published_holidays.fetch_forecast', side_effect=[DATA['2027'], ValueError('No rows')]):
                with self.assertRaises(SystemExit) as result:
                    main()
            self.assertEqual(result.exception.code, 1)
            self.assertEqual(dest.read_bytes(), before)

    def test_success_keeps_other_years_and_is_never_official(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'scripts') as folder:
            dest = Path(folder) / 'projections.json'
            dest.write_text(json.dumps({'2028': DATA['2028']}))
            with patch('sys.argv', ['published_holidays.py', '--year', '2027', '--destination', str(dest)]), patch('published_holidays.fetch_forecast', return_value=DATA['2027']):
                main()
            saved = json.loads(dest.read_text())
            self.assertEqual(set(saved), {'2027', '2028'})
            self.assertTrue(all(value['status'] == 'projected' for value in saved.values()))


if __name__ == '__main__':
    unittest.main()
