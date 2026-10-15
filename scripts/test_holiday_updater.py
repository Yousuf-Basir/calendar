"""Updater unit tests use synthetic fixtures, never official holiday data."""
import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).with_name('holiday_updater.py')

class DiscoveryTests(unittest.TestCase):
    def test_fixture_annual_row_excludes_amendments_and_wrong_year(self):
        self.assertTrue(MODULE.exists(), 'updater implementation is missing')
        spec = importlib.util.spec_from_file_location('updater', MODULE)
        updater = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(updater)
        html = '''<table><tr><td>২০২৭ ঈদের ছুটি পরিবর্তন</td><td><a href="/amend">দেখুন</a></td></tr>
        <tr><td>২০২৬ খ্রিষ্টাব্দের ছুটির তালিকার প্রজ্ঞাপন</td><td><a href="/wrong">দেখুন</a></td></tr>
        <tr><td>২০২৭ খ্রিষ্টাব্দের ছুটির তালিকার প্রজ্ঞাপন</td><td><a href="https://mopa.gov.bd/2027.pdf">PDF</a><a href="/pages/public-holiday/annual-2027">দেখুন</a></td></tr></table>'''
        self.assertEqual(updater.annual_notices(html, 'https://mopa.gov.bd/pages/public-holiday', 2027),
                         ['https://mopa.gov.bd/pages/public-holiday/annual-2027'])

def load():
    spec = importlib.util.spec_from_file_location('updater', MODULE)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class DownloadTests(unittest.TestCase):
    def test_fixture_rejects_unsafe_urls_and_html_instead_of_pdf(self):
        u = load()
        for url in ['http://mopa.gov.bd/a.pdf', 'https://mopa.gov.bd.evil.test/a',
                    'https://user@mopa.gov.bd/a', 'https://127.0.0.1/a', 'https://mopa.gov.bd:444/a']:
            with self.assertRaises(ValueError):
                u.safe_url(url)
        self.assertEqual(u.safe_url('https://www.dpp.gov.bd/a.pdf'), 'https://www.dpp.gov.bd/a.pdf')
        with self.assertRaises(ValueError):
            u.require_pdf(b'<html>blocked</html>')
        u.require_pdf(b'%PDF-1.7\nfixture')

    def test_fixture_pdf_extraction_uses_real_pdftotext_when_available(self):
        import shutil, tempfile
        if not shutil.which('pdftotext'):
            self.skipTest('optional real extractor fixture requires pdftotext')
        u = load()
        stream = b'BT /F1 12 Tf 72 720 Td (SYNTHETIC UNIT FIXTURE 2027) Tj ET'
        objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
            b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
            b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream',
            b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
        pdf = b'%PDF-1.4\n'
        offsets = [0]
        for index, obj in enumerate(objects, 1):
            offsets.append(len(pdf))
            pdf += f'{index} 0 obj\n'.encode() + obj + b'\nendobj\n'
        xref = len(pdf)
        pdf += b'xref\n0 6\n0000000000 65535 f \n'
        pdf += b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])
        pdf += f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
        with tempfile.TemporaryDirectory() as folder:
            path = pathlib.Path(folder) / 'synthetic-fixture.pdf'
            path.write_bytes(pdf)
            text, engine = u.extract_text(path)
            self.assertIn('SYNTHETIC UNIT FIXTURE 2027', text)
            self.assertIn('pdftotext', engine)

    def test_fixture_cloud_attachment_is_archived_but_sources_use_government_notice(self):
        import tempfile, json
        u = load()
        cloud = 'https://' + u.ATTACHMENT_HOST + u.ATTACHMENT_PREFIX + 'fixture.pdf'
        with tempfile.TemporaryDirectory() as folder:
            target = u.make_draft(2027, b'%PDF-1.7 fixture', cloud,
                'https://mopa.gov.bd/pages/public-holiday/annual-2027', '২০২৭ ছুটির তালিকা', pathlib.Path(folder),
                extractor=lambda p: ('', 'fixture scanned'))
            review = json.loads(target.read_text())
            self.assertEqual([source['url'] for source in review['sources']], ['https://mopa.gov.bd/pages/public-holiday/annual-2027'])
            self.assertEqual(json.loads((target.parent / 'metadata.json').read_text())['pdfUrl'], cloud)

    def test_fixture_draft_archives_source_text_hash_without_confirming(self):
        import tempfile
        import hashlib
        u = load()
        with tempfile.TemporaryDirectory() as folder:
            pdf = b'%PDF-1.7\nSYNTHETIC UNIT FIXTURE'
            draft_path = u.make_draft(2027, pdf, 'https://mopa.gov.bd/2027.pdf',
                'https://mopa.gov.bd/pages/public-holiday/2027',
                '২০২৭ খ্রিষ্টাব্দের ছুটির তালিকার প্রজ্ঞাপন', pathlib.Path(folder),
                extractor=lambda p: ('২০২৭ holidays synthetic text ' * 10, 'fixture'))
            import json
            draft = json.loads(draft_path.read_text())
            self.assertEqual(draft['status'], 'draft')
            self.assertFalse(draft['completeAnnualList'])
            self.assertEqual(draft['holidays'], [])
            meta = json.loads((draft_path.parent / 'metadata.json').read_text())
            self.assertEqual(meta['sha256'], hashlib.sha256(pdf).hexdigest())
            self.assertTrue((draft_path.parent / 'extracted.txt').read_text())
            self.assertFalse((pathlib.Path(folder) / 'confirmed-holidays.json').exists())

class ApplyTests(unittest.TestCase):
    def fixture(self, folder):
        import json
        u = load()
        target = u.make_draft(2027, b'%PDF-1.7\nFIXTURE', 'https://mopa.gov.bd/2027.pdf',
            'https://mopa.gov.bd/pages/public-holiday/2027', '২০২৭ ছুটির তালিকা', pathlib.Path(folder),
            extractor=lambda p: ('2027 fixture', 'fixture'))
        data = json.loads(target.read_text())
        data.update(completeAnnualList=True, reviewedBy='Unit fixture reviewer', verifiedOn='2026-10-15',
            holidays=[{'date': f'2027-{month:02d}-21', 'names': [{'en': 'Fixture holiday', 'bn': 'পরীক্ষা'}], 'scope': 'national'} for month in range(1, 13)])
        target.write_text(json.dumps(data))
        return u, target, data

    def test_fixture_apply_requires_attestation_and_preserves_older_years(self):
        import tempfile, json
        with tempfile.TemporaryDirectory() as folder:
            u, review, data = self.fixture(folder)
            destination = pathlib.Path(folder) / 'confirmed.json'
            old = {'2026': {'sentinel': 'existing historical data'}}
            destination.write_text(json.dumps(old))
            with self.assertRaises(ValueError):
                u.apply_review(review, destination, 2027, False)
            self.assertEqual(json.loads(destination.read_text()), old)
            u.apply_review(review, destination, 2027, True)
            result = json.loads(destination.read_text())
            self.assertEqual(result['2026'], old['2026'])
            self.assertEqual(result['2027']['status'], 'official')
            self.assertEqual(result['2027']['holidays'], data['holidays'])
            self.assertTrue(result['2027']['completeAnnualList'])
            self.assertEqual(result['2027']['reviewedBy'], data['reviewedBy'])
            self.assertNotIn('archive', result['2027'])

    def test_fixture_nonobject_review_fails_with_validation_error(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            u, review, _ = self.fixture(folder)
            review.write_text('[]')
            with self.assertRaisesRegex(ValueError, 'object'):
                u.apply_review(review, pathlib.Path(folder) / 'confirmed.json', 2027, True)

    def test_fixture_atomic_replace_failure_preserves_previous_bytes(self):
        import tempfile
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as folder:
            u, review, _ = self.fixture(folder)
            destination = pathlib.Path(folder) / 'confirmed.json'
            destination.write_text('{"2026": {"keep": true}}')
            before = destination.read_bytes()
            with patch('os.replace', side_effect=OSError('synthetic write failure')):
                with self.assertRaises(OSError):
                    u.apply_review(review, destination, 2027, True)
            self.assertEqual(destination.read_bytes(), before)
            self.assertFalse(destination.with_name('confirmed.json.lock').exists())
            self.assertEqual(list(pathlib.Path(folder).glob('.holidays-*')), [])

    def test_fixture_source_year_mismatch_is_not_hidden_by_metadata(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            u, review, _ = self.fixture(folder)
            (review.parent / 'notice.txt').write_text('২০২৮ ছুটির তালিকা')
            (review.parent / 'extracted.txt').write_text('2028 fixture')
            destination = pathlib.Path(folder) / 'confirmed.json'
            destination.write_text('{}')
            with self.assertRaises(ValueError):
                u.apply_review(review, destination, 2027, True)
            self.assertEqual(destination.read_text(), '{}')

    def test_fixture_invalid_reviews_never_modify_destination(self):
        import tempfile, json, copy
        with tempfile.TemporaryDirectory() as folder:
            u, review, original = self.fixture(folder)
            destination = pathlib.Path(folder) / 'confirmed.json'
            destination.write_text('{"2026": {"keep": true}}')
            before = destination.read_bytes()
            bad = []
            for key, value in [('year', 2028), ('completeAnnualList', False), ('holidays', []),
                               ('reviewedBy', ''), ('verifiedOn', '2099-01-01'), ('workingDays', ['2027-02-21']),
                               ('sources', [{'url': 'https://example.com/2027.pdf', 'label': 'fake'}])]:
                item = copy.deepcopy(original); item[key] = value; bad.append(item)
            for field, value in [('date', '2027-02-30'), ('date', '2028-02-21'), ('scope', 'unknown'), ('names', [])]:
                item = copy.deepcopy(original); item['holidays'][0][field] = value; bad.append(item)
            item = copy.deepcopy(original); item['holidays'] *= 2; bad.append(item)
            for item in bad:
                review.write_text(json.dumps(item))
                with self.subTest(item=item):
                    with self.assertRaises((ValueError, TypeError)):
                        u.apply_review(review, destination, 2027, True)
                    self.assertEqual(destination.read_bytes(), before)
            review.write_text(json.dumps(original))
            (review.parent / 'annual.pdf').write_bytes(b'%PDF-1.7 tampered')
            with self.assertRaises(ValueError):
                u.apply_review(review, destination, 2027, True)
            self.assertEqual(destination.read_bytes(), before)

class CandidateTests(unittest.TestCase):
    def test_fixture_date_hints_are_separate_from_confirmed_rows(self):
        u = load()
        text = 'Fixture holiday 21 February 2027\nপরীক্ষা ২৬ মার্চ ২০২৭\nwrong 2026\noptional 25 December 2027'
        hints = u.date_candidates(text, 2027)
        self.assertEqual([h['date'] for h in hints], ['2027-02-21', '2027-03-26', '2027-12-25'])
        self.assertIn('Fixture holiday', hints[0]['rawLine'])
        self.assertNotIn('names', hints[0])

class CLITests(unittest.TestCase):
    def test_cli_help_explains_review_and_does_not_download(self):
        import subprocess, sys
        result = subprocess.run([sys.executable, str(MODULE), '--help'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn('--notice-url', result.stdout)
        self.assertIn('--pdf-url', result.stdout)
        self.assertIn('--attest-reviewed', result.stdout)

    def test_fixture_extraction_timeout_is_reported_without_traceback(self):
        import subprocess, contextlib, io
        from unittest.mock import patch
        u = load()
        error = io.StringIO()
        with (patch.object(u, 'discover', return_value=('https://mopa.gov.bd/2027.pdf', None, '')),
              patch.object(u, 'fetch', return_value=(b'%PDF-1.7 fixture', 'https://mopa.gov.bd/2027.pdf')),
              patch.object(u, 'make_draft', side_effect=subprocess.TimeoutExpired('fixture OCR', 1)),
              contextlib.redirect_stderr(error), contextlib.redirect_stdout(io.StringIO())):
            self.assertEqual(u.main(['--year', '2027', '--ocr']), 1)
        self.assertIn('ERROR:', error.getvalue())

    def test_fixture_discovery_follows_notice_to_storage_attachment(self):
        u = load()
        calls = []
        def fixture_fetch(url, attachment=False):
            calls.append((url, attachment))
            if 'archived=' in url or url.endswith('public-holiday/'):
                return ('<table><tr><td>২০২৭ খ্রিষ্টাব্দের ছুটির তালিকার প্রজ্ঞাপন</td><td><a href="/pages/public-holiday/annual-2027">দেখুন</a></td></tr></table>'.encode(), url)
            return ('<h2>২০২৭ খ্রিষ্টাব্দের ছুটির তালিকার প্রজ্ঞাপন</h2><a href="https://' + u.ATTACHMENT_HOST + u.ATTACHMENT_PREFIX + 'fixture.pdf">PDF</a>').encode(), url
        pdf_url, notice_url, title = u.discover(2027, fetcher=fixture_fetch)
        self.assertTrue(pdf_url.endswith('fixture.pdf'))
        self.assertTrue(notice_url.endswith('annual-2027'))
        self.assertIn('২০২৭', title)
        self.assertLessEqual(len(calls), 7)
        with self.assertRaises(ValueError):
            u.discover(2028, fetcher=fixture_fetch)

class OCRTests(unittest.TestCase):
    def test_scanned_fixture_is_explicitly_flagged_and_stays_empty(self):
        import tempfile, json
        u = load()
        with tempfile.TemporaryDirectory() as folder:
            target = u.make_draft(2027, b'%PDF-1.7 scanned fixture', 'https://mopa.gov.bd/2027.pdf',
                None, '', pathlib.Path(folder), extractor=lambda p: ('', 'fixture scanned'))
            self.assertEqual(json.loads((target.parent / 'metadata.json').read_text())['extractionStatus'], 'ocr-required')
            self.assertEqual(json.loads(target.read_text())['holidays'], [])

    def test_ocr_without_tools_returns_actionable_error(self):
        from unittest.mock import patch
        u = load()
        with patch.object(u.shutil, 'which', return_value=None):
            with self.assertRaisesRegex(ValueError, 'tesseract'):
                u.ocr_text(pathlib.Path('fixture.pdf'))

if __name__ == '__main__':
    unittest.main()
