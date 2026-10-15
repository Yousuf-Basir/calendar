# Updating Bangladesh government holidays

The app bundles holiday data; it does **not** scrape government PDFs in the browser. Future projections are **not official**. The maintainer pipeline below downloads evidence and creates a review draft. Only a separate, explicitly attested apply step can add an official year to `src/data/confirmed-holidays.json`. Historical 2026 data is not rewritten by downloading or reviewing a gazette.

## Published forecast refresh (separate from government confirmation)

Custom calculated dates were removed. Published Calendarific forecasts are loaded for 2027–2030 only; unsupported 2031–2036 dates are not shown. To refresh the published subset:

```sh
npm run holidays:published -- --year 2027 --year 2028 --year 2029 --year 2030 --replace-all
```

The command filters the publisher's mixed holiday/observance table through an explicit nationwide-holiday category allowlist, excludes Eid extension rows, and keeps only the first date in any consecutive same-name Eid run. It retains selected source dates and provenance and keeps every imported record unconfirmed. It does **not** promote a year to official or replace government records. Optional leave and bank-only closures are excluded. All requested downloads must succeed before replacing data. Government announcements take priority even when an established provider disagrees. See `CALENDAR.md` for source coverage, caveats and published-date checks.

## Requirements

- Node/npm for the existing app; Python 3.10+ available as `python3` (Windows: use Python/WSL or invoke the script with your Python executable).
- Text extraction: Poppler's `pdftotext` (recommended), or `python3 -m pip install pypdf` in your Python environment. Tests need only the Python standard library.
- For scanned/legacy-font PDFs, install Poppler and Tesseract with Bengali **and** English language data. Debian/Ubuntu example:

```sh
sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-ben tesseract-ocr-eng
```

No OCR output, extracted text or guessed religious date is automatically official.

## 1. End-of-year / next-year download

For the next annual update, run from this repository:

```sh
npm run holidays:update -- --year 2027
```

The script examines MOPA's current holiday listing and at most three archive pages, selects a row whose title identifies the requested year's annual holiday list, opens the actual notice, and follows its actual PDF link. It does not change a previous year's filename or interpret an amendment as the annual list. Multiple matching notices/attachments require an explicit selection. Discovery is bounded and can miss a deeply archived notice; failure does **not** prove that the government has not published it.

Primary starting points:

- https://mopa.gov.bd/pages/public-holiday/
- https://mopa.gov.bd/pages/public-holiday?archived=true&page=1&page_size=10
- https://www.dpp.gov.bd/

When the site changes or a notice is not discovered, visually find the requested year's annual notification and supply its actual URL:

```sh
npm run holidays:update -- --year 2027 --notice-url 'ACTUAL_HTTPS_GOVERNMENT_ANNUAL_NOTICE_URL'
# Or supply the actual government-hosted gazette PDF:
npm run holidays:update -- --year 2027 --pdf-url 'ACTUAL_HTTPS_GOVERNMENT_PDF_URL'
# Multiple attachments: choose the real PDF linked by that notice:
npm run holidays:update -- --year 2027 --notice-url 'ACTUAL_NOTICE_URL' --pdf-url 'ACTUAL_ATTACHMENT_URL'
```

These uppercase placeholders are not runnable source URLs. Use the real government URLs, not an unofficial holiday/calendar website. Direct PDFs must be HTTPS `*.gov.bd`. MOPA currently also links files on its specific Oracle object-storage namespace: this is allowed **only with a government notice**, and the supplied storage URL must be one of that notice's actual PDF links. Arbitrary cloud storage is rejected. Redirects are checked, HTTP downgrade is rejected, downloads are capped at 25 MiB with a 25-second request deadline/socket timeout, and HTML masquerading as a PDF fails before review. PDF extraction is subprocess-isolated with time limits; OCR accepts at most 20 pages. Process external PDFs only on a maintained machine.

If text extraction reports `ocr-required` or `legacy-font-or-unreadable-text`, rerun with OCR:

```sh
npm run holidays:update -- --year 2027 --ocr
# Combine --ocr with --notice-url / --pdf-url if discovery needed a fallback.
```

The command prints the exact review path under `scripts/holiday-sources/YEAR/TIMESTAMP-HASH/`. Each run gets a new archive; previous drafts are not overwritten. Use `--output-dir PATH` to keep evidence somewhere else. The default evidence directory is gitignored: retain/copy the reviewed archive in your durable maintenance records.

Files produced:

- `annual.pdf`: actual downloaded bytes, not a generated PDF.
- `metadata.json`: downloaded UTC timestamp, actual source URLs, byte count, SHA-256, extraction engine/status, requested year and source-year-match result.
- `notice.txt`: annual notice heading captured from the government page (blank for direct-PDF mode).
- `extracted.txt`: actual layout extraction or optional Bengali/English OCR.
- `date-candidates.json`: ISO date hints with their original lines, **not** classified holidays. These reduce transcription where text is readable. They can include optional leave and notes and miss date ranges, broken columns or OCR misspellings; never bulk-promote them.
- `review.json`: deliberately unconfirmed review template. No automatic `official` status, no projected dates, no silent empty-year publication.

A successful download means evidence is ready, **not** that holidays are confirmed. Missing tools/scans are clearly flagged; install OCR or review the PDF visually. The real 2026 MOPA attachment was scanned, so ordinary text extraction yielded no usable list; Bengali OCR produced reviewable text but had table/date errors. This is why the parser fails closed rather than filling the official array.

## 2. Review the complete list

Open `annual.pdf` and compare every date/name to `extracted.txt`. Use `date-candidates.json` as a transcription aid, not a complete list. No generic parser can reliably recover Bangla tables, multi-line date ranges, optional-leave exclusions and regional footnotes. If OCR remains unusable, obtain an accessible government version or manually transcribe; do not change a projection's status to official.

Populate `review.json`'s `holidays` array with complete ISO Gregorian dates, bilingual names and explicit scope. Example **shape only**, not a complete annual list:

```json
{
  "date": "2027-02-21",
  "names": [{ "en": "Holiday name checked against gazette", "bn": "গেজেট দেখে যাচাইকৃত নাম" }],
  "scope": "national"
}
```

- Include nationwide general holidays and executive-order holidays; expand multi-day ranges into individual dates.
- Merge multiple names on the same date into a single `names` array. Dates must be unique.
- Use `regional` only for the app's existing Chittagong Hill Tracts scope; another regional definition needs frontend/schema work before applying it.
- Exclude optional personal religious leave, school/bank-only calendars and ordinary weekly weekends.
- Keep exceptional working days as full ISO strings in `workingDays`. Remove any holiday that an amendment explicitly cancels; a date cannot be both holiday and replacement working day.
- Read later amendments at https://mopa.gov.bd/pages/go-ultimates and the holiday notices, including moon-sighting changes. Add their actual government URLs and descriptive year-specific labels to `sources`; retain the original annual government notice and any government-hosted PDF URLs. Oracle attachment URLs stay in archive metadata (the government notice, not the storage vendor, is the published source).
- Keep the archived PDF, metadata and `archive.sha256` intact. Do not claim review of a PDF other than the one downloaded.
- Set `verifiedOn` to the real review date (`YYYY-MM-DD`), `reviewedBy` to your name, and **only after complete review** set `completeAnnualList` to `true`. Leave `status: "draft"`; the apply command sets official status.

The target year must occur in the source notice heading or actual extracted PDF text. Labels/filenames alone are not evidence of the year. If direct PDF extraction cannot establish its year, supply the correct annual government notice and rerun (with OCR if needed), rather than editing the archive metadata to bypass the check.

## 3. Explicitly apply reviewed data

Use the exact `review.json` path printed by the downloader, keeping it next to its archive files:

```sh
npm run holidays:apply -- --year 2027 --review 'scripts/holiday-sources/2027/ACTUAL_RUN_FOLDER/review.json' --attest-reviewed
```

`--attest-reviewed` means: **I personally checked the complete annual list, scopes, bilingual names, date ranges, notes, optional-leave exclusions and known amendments.** This is not a flag for an unattended scheduled job.

Apply validates the requested/archive/review year, source-year match, retained government sources, archived PDF hash, nonfuture review date, named reviewer, `completeAnnualList: true`, at least 10 distinct holiday dates spanning at least six months, real ISO dates in the target year, nonempty English/Bangla names, allowed scopes, and unique/nonconflicting working days. The count/month checks are sanity gates, **not proof of completeness**: completeness still requires a human reading every relevant section. Invalid, partial, empty, malformed or tampered reviews fail without changing confirmed data. Duplicate JSON keys are rejected.

Apply writes only the selected year into the confirmed-year mapping, preserving all other years. A same-directory atomic replacement and exclusive updater lock prevent partial writes/concurrent updater loss. A stale `.lock` after a killed process must be inspected and removed only when no updater is running. Existing malformed confirmed data is never discarded to recover. Apply reads back the exact saved year before reporting success. Do not hand-edit the same destination while applying.

For amendments, prepare/review the **entire year's list**, retain the annual evidence, add the amendment sources, and reapply that year. Do not apply a short amendment-only list. Download/review does not modify the base 2026 records; do not use a smoke test as an instruction to replace them.

## 4. Test, rebuild and release

```sh
npm run test:holidays-updater
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

The updater tests are explicitly synthetic-fixture unit tests: they exercise discovery filtering, safe URLs/PDF signatures, archives/hash, date hints, OCR failure flags, attestation, validation, atomic/preserved older-year behavior, and CLI help without claiming network verification. A live download smoke check is separate:

```sh
npm run holidays:update -- --year 2026 --output-dir /path/to/scratch/evidence
# Optional scanned-PDF smoke:
npm run holidays:update -- --year 2026 --ocr --output-dir /path/to/scratch/evidence-ocr
```

Add calendar integration assertions using actual reviewed source dates. Check both languages/views, holiday dots/list dates, regional labels, working-day exceptions, year boundaries, retained 2026 records, and removal of the projection warning **only for the reviewed official year**. Unconfirmed future years must stay visibly projected. Do not confuse the displayed Gregorian-month holiday list with the native Bengali grid's different month boundaries.

Confirmed JSON is bundled into the build. Neither downloading nor applying updates an already deployed/offline app. Before release, increment `CACHE_NAME` in `public/sw.js` to a unique release value (also for amendments), build again, and publish the **whole** `dist/` atomically. `vite.config.js` injects hashed build assets into the service worker. Revalidate `sw.js` and `index.html` at the host/CDN; hashed assets may be long-lived. Existing offline users keep the old data until an online visit installs the new worker and a reload activates the new app. Test that upgrade path and offline navigation in production preview, not just Vite dev mode. Keep a preceding release for rollback.

## Recorded live smoke — 15 October 2026

Real network execution, not unit fixtures:

- `--year 2026` discovered the annual MOPA notice ending `2df487-694139b2a31054345f0e6346` and followed its linked Oracle `office-mopa/2024/12/209c6283d9234a0fa8f1f30b90068b57.pdf` (the storage path's year is not the holiday year).
- Actual PDF: **392966 bytes**, SHA-256 `9dba0a97eb9790eefa695b92ac3ecd04630037c58ffb69aa935bc958f421de93`.
- `pdftotext -layout` reported `ocr-required`; rerunning with `--ocr` yielded 6628 text characters and 44 untrusted date hints, including optional leave and imperfect table text. Neither run applied anything.
- `--year 2027` exited 1 with `No 2027 annual notice discovered`; this bounded result is not a declaration that no 2027 gazette exists.
- No 2026 official data was overwritten; no new year was confirmed or deployed by these smoke checks.
