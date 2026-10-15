# Calendar conventions and offline data

The supported civil date range is 1 January 2020–31 December 2100. UTC day numbers prevent timezone changes from moving dates between cells. Today uses `Asia/Dhaka`. Both calendars have Sunday-first weeks, with Friday in the sixth column.

English uses Gregorian dates. Bangla uses Bangladesh's 2019 revised civil calendar: New Year on 14 April, six 31-day months, five 30-day months, and Falgun with 29 days (30 in the relevant Gregorian leap year). This differs from West Bengal's astronomical calendar. References: [Government Teachers' Portal](https://teachers.gov.bd/index.php/blog/details/788609), [Bangla Academy](https://banglaacademy.gov.bd/pages/news/6922d8f3933eb65569dfb759).

## Government-confirmed records

`src/data/bangladesh-holidays.js` preserves the existing 2026 dataset from the [official gazette](https://www.dpp.gov.bd/upload_file/gazettes/59216_19984.pdf) and recorded amendments:

- [11–12 February election holidays](https://www.bssnews.net/national-parlament-election-2026/353742).
- [18 March additional Eid holiday](https://mopa.gov.bd/pages/go-ultimates/আসন্ন-পবিত্র-ঈদ-উল-ফিতর-উপলক্ষ্যে-১৮-মার্চ-২০২৬-তারিখ-বুধবার-নির্বাহী-আদেশে-সরকারি-ছুটি-ঘোষণা-7rea6d-69ad3e37f681a7e2728823e8).
- [22 October extra Puja holiday / 17 October working day](https://www.bssnews.net/bangla/news-flash/347353).
- [7 November holiday](https://mopa.gov.bd/pages/go-ultimates/6ac5e76d9594596dad446b72).

Its verification timestamp remains **2026-10-08**; importing provider forecasts does not re-verify government records. April 13 is marked regional for Rangamati, Khagrachhari and Bandarban. Optional religious leave, ordinary weekends and school/bank-only closures are excluded.

## Published forecasts — not government confirmation

The former locally calculated 2027–2036 dataset and astronomy generator have been removed. `src/data/projected-holidays.json` now contains dates actually published by Calendarific for **2027–2030**:

- https://calendarific.com/holidays/2027/BD
- https://calendarific.com/holidays/2028/BD
- https://calendarific.com/holidays/2029/BD
- https://calendarific.com/holidays/2030/BD

Each fetched page had 72 holiday/observance rows. The importer explicitly selects the existing nationwide government-holiday categories, including the provider's Eid closure forecasts, rather than importing all events. Optional Buddha Purnima leave, optional Puja leave, Valentine's Day, Halloween, solstices, bank-only holidays and unclassified regional entries are excluded. This category selection is a maintainer policy, **not an assertion that the government has confirmed future dates or closure lengths**. No missing holiday or extra date is generated locally.

The selected forecasts contain 29 dates for 2027, 28 for 2028, 30 for 2029 and 27 for 2030. Dates with multiple names are combined into one record. Original publisher names/dates, publisher URL, retrieved date, raw page SHA-256 and source row count are retained for attribution and audit.

Every forecast year and record remains `projected`, with `verifiedOn: null`. Established providers can disagree: Office Holidays lists 2027 Eid from March 9 and Durga Puja on October 9, while Calendarific lists the main Eid festival on March 10 and Puja on October 10. Neither third-party forecast settles the government's eventual dates. The app consistently uses the attributed Calendarific dataset rather than mixing dates or silently picking a result of our calculations.

**2031–2036 have no loaded holidays.** The checked provider pages had no published rows; the app shows a missing-data notice instead of keeping unsupported calculated dates. Calendar navigation still works throughout the full civil range.

The warning is deliberately short, with the displayed year substituted:

- English: `Projected holidays for 2027 — not confirmed by the government`
- Bangla: `সম্ভাব্য ছুটির বছর: ২০২৭ — সরকারিভাবে নিশ্চিত নয়।`

Projected list items and accessible grid descriptions remain labelled unconfirmed. Holiday information appears only in the English calendar view; the separate Bangla app language localizes it.

## Refreshing published forecasts

```sh
npm run holidays:published -- --year 2027 --year 2028 --year 2029 --year 2030 --replace-all
npm test
npm run build
```

This fetches the publisher pages, validates country/year, valid civil dates and displayed weekdays, rejects duplicate rows or incomplete coverage, applies the explicit category allowlist, and atomically updates only projected data after **all requested downloads succeed**. Empty future pages and network errors leave existing data untouched. `--replace-all` removes years not explicitly requested; omit it to retain other published years. Review the resulting diff before releasing. It does not touch `confirmed-holidays.json` or the preserved 2026 baseline. An import failure is not evidence that a government notification does not exist.

## Official overrides and release

Use `npm run holidays:update -- --year YEAR --ocr` to discover/download the annual government notification and produce review evidence. After personally checking the complete annual list and amendments, use `holidays:apply` as documented in [HOLIDAY_UPDATES.md](HOLIDAY_UPDATES.md).

`src/data/confirmed-holidays.json` stores whole-year reviewed overrides. They replace a projected year rather than merging stale forecast dates, and can extend coverage to currently unavailable years. Validation requires government HTTPS provenance, valid bilingual records, named review, a nonfuture review date, `completeAnnualList: true`, at least ten dates across six months, unique dates and nonconflicting working days. These are sanity checks, not proof of completeness; human source review remains mandatory.

All records and fonts are bundled for offline use. No publisher scraping, remote API or astronomy calculation runs in the browser. Updating JSON alone does not update an installed app: increment the worker cache version, test, build and publish the full production output. Offline clients need an online visit and reload to receive it.

## Interaction and checks

Three month pages use native horizontal scrolling and CSS snap points. After scrolling settles, pages rotate and recenter. Buttons use the same mechanism; reduced-motion users get immediate scrolling. All grids have six rows and blank cells outside their displayed month. Bengali headings show their inclusive Gregorian date range.

Month navigation retains the day number where possible and clamps for shorter months. Today returns to the Bangladesh date. Calendar switches preserve the underlying civil date. The menu's independent app-language choice persists as `calendar-language-v1`, defaults to English and safely handles blocked storage.

Run `npm test` for calendar conversions, published-source dates, official override integration, warning translations, updater safety, PWA and grid checks. Run `npm run build` and production preview for offline checks.
