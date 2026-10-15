# Calendar conventions and offline data

The supported civil date range is 1 January 2020–31 December 2100. Internally, UTC day numbers prevent timezone and daylight-saving changes from moving dates between cells. Today uses `Asia/Dhaka`. All views have Sunday-first weeks, with Friday in the sixth (second-last) column.

English uses Gregorian dates. Bangla uses Bangladesh's 2019 revised civil calendar: New Year on 14 April, six 31-day months, five 30-day months, and Falgun with 29 days (30 when the Gregorian year containing Falgun is a leap year). This differs from the astronomical Bengali calendar used in West Bengal. References: [Government Teachers' Portal calendar rules](https://teachers.gov.bd/index.php/blog/details/788609), [Bangla Academy: 26 February 2020 = 13 Falgun 1426](https://banglaacademy.gov.bd/pages/news/6922d8f3933eb65569dfb759).

## Government holidays

`src/data/bangladesh-holidays.js` bundles 2026 general and executive-order holidays from the [official gazette](https://www.dpp.gov.bd/upload_file/gazettes/59216_19984.pdf), with these later changes:

- [11 and 12 February election holidays](https://www.bssnews.net/national-parlament-election-2026/353742).
- [18 March additional Eid holiday](https://mopa.gov.bd/pages/go-ultimates/আসন্ন-পবিত্র-ঈদ-উল-ফিতর-উপলক্ষ্যে-১৮-মার্চ-২০২৬-তারিখ-বুধবার-নির্বাহী-আদেশে-সরকারি-ছুটি-ঘোষণা-7rea6d-69ad3e37f681a7e2728823e8).
- [22 October additional Durga Puja holiday; 17 October designated a working day](https://www.bssnews.net/bangla/news-flash/347353).
- [7 November National Revolution and Solidarity Day](https://mopa.gov.bd/pages/go-ultimates/6ac5e76d9594596dad446b72).

Chaitra Sankranti on 13 April is explicitly regional (Rangamati, Khagrachhari and Bandarban). Optional religious leave and school- or bank-only closures are excluded. Multiple holidays on one date share a cell and list item. Ordinary weekly closures are separate from holiday entries; Fridays have a red column.

Holiday records retain full Gregorian ISO civil dates. Holidays are shown only in the English calendar: its holiday list, designated working days, grid markers, and accessible holiday descriptions follow the displayed Gregorian month. The Bengali calendar view does not show holiday information; the separate Bangla **app language** localizes the English-calendar holiday information. Six-week grids show only the displayed month; cells before its first day and after its last day are blank. Bengali headings show their inclusive Gregorian date range. Coverage is official for 2026 and projected for 2027–2036. Years outside that coverage show a missing-data notice, not an invented holiday calendar.

The 2026 records, source URLs, October 17 working day, and **2026-10-08 verification timestamp are preserved**. Adding projections does not constitute re-verification of those official sources.

Sources are retained in the checked-in data and this document, and hidden in the app. Bundled records and fonts work offline after successful service-worker installation; the app requires no source website connection. No remote API or scraping runs in the browser. New years and later amendments require updating the checked-in data and rebuilding.

## Projected years and official replacements

`src/data/projected-holidays.json` contains deterministic, precomputed 2027–2036 core dates. Every future year and record is `projected`, including fixed-date policy assumptions. `HOLIDAY_METADATA` distinguishes these years from `official` years; projections have `verifiedOn: null` and no official-source claims. A visible English/Bangla warning follows the displayed Gregorian year even in months without holidays. Each projected list entry and grid accessible description is also labelled unconfirmed. The warning explains lunar-date uncertainty, future policy changes, and the exclusion of additional Eid closure days.

The maintainer-only `src/data/projection-builder.js` uses these calculation rules:

- Islamic dates use the arithmetic Islamic civil calendar (Friday epoch, Julian day 1948439.5 at midnight; alternating 30/29-day months; 11 leap days in each 30-year cycle), consistent with [Unicode ICU's primary implementation](https://github.com/unicode-org/icu/blob/main/icu4c/source/i18n/islamcal.cpp). Every Hijri year intersecting the Gregorian year is considered, so 2033 includes two Eid-ul-Fitr core days. Jumatul Bida is the last Friday before calculated Shawwal 1. These are **not** local crescent-sighting forecasts; official dates can differ, commonly by 1–2 days, and sometimes more.
- Hindu/Buddhist dates use actual Sun–Moon elongation searches and Dhaka sunrise from [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js) (MIT). Tithis are 12-degree elongation intervals. Lunations are named using approximate mean-Lahiri sidereal solar signs at bounding new moons; a lunation with no solar-sign change is intercalary and skipped. The month/intercalation approach follows the primary [Drik Panchanga implementation's `masa` and `tithi` algorithms](https://github.com/webresh/drik-panchanga/blob/master/panchanga.py); no third-party festival tables or Bangladesh fixed lunar dates are copied. The mean-Lahiri approximation (23.853055 degrees at J2000, advancing 50.29 arcseconds/year) only chooses the lunar month, not phase timing.
- Buddha Purnima is Vaisakha bright-fortnight tithi 15; Janmashtami is Shravana dark-fortnight tithi 8 (Bhadrapada in purnimanta naming); Puja core dates are Ashwin bright-fortnight tithis 9 and 10. Civil-day selection uses the first Dhaka sunrise inside the tithi, or the festival evening whose following midnight lies inside it for Janmashtami. A tithi that misses that observation point uses its **calculated local starting date**, not a fixed Gregorian fallback. These simplified observance rules can differ from Bangladesh's chosen panjika, regional priorities or official announcement by a day. They are estimates, not ritual guidance.
- Only one core day per Eid occurrence is projected. Multi-day Eid closures, 2026 election dates, the extra Puja holiday, November 7, and special working Saturdays are **not extrapolated**. April 13 remains regional. Existing recurring fixed-date assumptions (including August 5) remain explicitly subject to future government policy.

Astronomy runs only when regenerating the committed JSON. The browser imports neither the generator nor an astronomy library; no additional runtime dependency or network service is required. To regenerate with an independently installed maintainer dependency:

```sh
# Install astronomy-engine@2.1.19 outside the application dependency tree.
export ASTRONOMY_ENGINE_PATH=/absolute/path/to/node_modules/astronomy-engine
node --test src/data/projection-builder.test.js
node --input-type=module <<'JS'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { buildProjectedYear } from './src/data/projection-builder.js'
const astronomy = createRequire(import.meta.url)(process.env.ASTRONOMY_ENGINE_PATH)
const years = Object.fromEntries(Array.from({ length: 10 }, (_, i) => {
  const year = 2027 + i
  return [year, buildProjectedYear(year, astronomy)]
}))
writeFileSync('src/data/projected-holidays.json', JSON.stringify(years, null, 2) + '\n')
JS
npm test
npm run build
```

`src/data/confirmed-holidays.json` initially contains `{}`. Its keys are Gregorian years and each value is `{ year, status: 'official', verifiedOn, sources: [{ url, label }], holidays: [{ date, names: [{ en, bn }], scope }], workingDays: [] }`. Valid annual overrides replace the **entire** projected year, including its working days, rather than merging stale predicted dates. They can also extend official coverage beyond 2036 within the supported civil range. Never put a partial amendment into this file as if it were a full year; incorporate it into the complete reviewed annual record instead.

The exported `validateConfirmedYear(value, year)` and `buildHolidayData(overrides)` fail closed on invalid dates, year mismatches, missing bilingual names, duplicates, working-day/holiday conflicts, non-official statuses, empty sources, unsafe URLs, empty years and structurally partial years. Completeness conservatively requires the six core fixed national days on their expected dates and all ten named core religious festivals, even if dates collide. Source URLs must be HTTPS government (`*.gov.bd`) or Bangladesh Sangbad Sangstha pages. The checker cannot prove a document actually says what a reviewed record claims, nor detect every omitted extra day: a maintainer must verify the **complete annual gazette and amendments**. If policy removes/renames a required holiday, deliberately update the completeness gate and tests after review instead of bypassing validation. A rejected override leaves the original projected status and warning in place.

## Interaction and checks

Three month pages use native horizontal scrolling and CSS snap points. After scrolling settles, pages rotate and recenter before paint. Buttons use the same mechanism. Reduced-motion users get immediate scrolling. There are no React renders on each pointer movement, and all month grids keep six rows at a consistent height.

Dates are static, with today highlighted. Month navigation retains the underlying day number where possible and clamps for shorter months. Today returns to the Bangladesh date. Calendar switches preserve the underlying civil date. Holiday information is hidden in the Bengali calendar view; switching back uses the currently displayed Gregorian month.

Run `npm test` for conversion, leap-year, holiday, and grid checks, including round trips for every supported day in both systems. Use `npm run build` and `npm run preview` for production offline checks.


For the annual download, verification, data update, and offline release procedure, see [HOLIDAY_UPDATES.md](HOLIDAY_UPDATES.md).

## App language

The menu button before the title opens a left settings drawer. App language (English or Bangla) is separate from the English/Bangla calendar selector. The saved choice uses localStorage key `calendar-language-v1`, defaults to English, and falls back safely when storage is blocked. Bangla localizes the interface, all calendar labels and numbers, holiday names, connection status, and installation instructions. Browser-owned installation prompts follow the browser/OS language.
