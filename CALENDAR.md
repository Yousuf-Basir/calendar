# Calendar conventions and offline data

The supported civil date range is 1 January 2020–31 December 2100. Internally, UTC day numbers prevent timezone and daylight-saving changes from moving dates between cells. Today uses `Asia/Dhaka`. All views have Sunday-first weeks, with Friday in the sixth (second-last) column.

English uses Gregorian dates. Bangla uses Bangladesh's 2019 revised civil calendar: New Year on 14 April, six 31-day months, five 30-day months, and Falgun with 29 days (30 when the Gregorian year containing Falgun is a leap year). This differs from the astronomical Bengali calendar used in West Bengal. References: [Government Teachers' Portal calendar rules](https://teachers.gov.bd/index.php/blog/details/788609), [Bangla Academy: 26 February 2020 = 13 Falgun 1426](https://banglaacademy.gov.bd/pages/news/6922d8f3933eb65569dfb759).

The Arabic calendar uses English labels and digits, with confirmed Bangladesh Hijri month starts where available. Known starts span Rajab 1447 through Rabi al-Thani 1448. Other starts are forecasts using arithmetic Hijri month lengths, anchored to the most recent confirmed Bangladesh start (or projected backwards from the first known start). Estimates and unconfirmed ending boundaries are labelled in the UI. This does not replace the National Moon Sighting Committee. Religious observance begins at sunset the preceding day; calendar cells represent the civil daytime date.

Sources appear alongside every entry in `src/data/bangladesh-moon-starts.js`. Rajab's start is derived from the committee's announcement that it ended on 20 January after 30 days. Muharram's start is derived from the official Ashura date, 10 Muharram = 26 June. The current Rabi al-Thani start is confirmed; its ending boundary awaits the next local moon announcement. Data was checked on 8 October 2026.

## Government holidays

`src/data/bangladesh-holidays.js` bundles 2026 general and executive-order holidays from the [official gazette](https://www.dpp.gov.bd/upload_file/gazettes/59216_19984.pdf), with these later changes:

- [11 and 12 February election holidays](https://www.bssnews.net/national-parlament-election-2026/353742).
- [18 March additional Eid holiday](https://mopa.gov.bd/pages/go-ultimates/আসন্ন-পবিত্র-ঈদ-উল-ফিতর-উপলক্ষ্যে-১৮-মার্চ-২০২৬-তারিখ-বুধবার-নির্বাহী-আদেশে-সরকারি-ছুটি-ঘোষণা-7rea6d-69ad3e37f681a7e2728823e8).
- [22 October additional Durga Puja holiday; 17 October designated a working day](https://www.bssnews.net/bangla/news-flash/347353).
- [7 November National Revolution and Solidarity Day](https://mopa.gov.bd/pages/go-ultimates/6ac5e76d9594596dad446b72).

Chaitra Sankranti on 13 April is explicitly regional (Rangamati, Khagrachhari and Bandarban). Optional religious leave and school- or bank-only closures are excluded. Multiple holidays on one date share a cell and list item. Ordinary weekly closures are separate from holiday entries; Fridays have a red column.

Holiday records retain their Gregorian civil dates. The list uses the Gregorian month containing the browsed date in every view, and converts each holiday to the selected calendar. Its heading identifies that Gregorian month because Bengali and Hijri month boundaries differ. Grid markers remain attached to the actual civil date. Six-week grids show only the displayed month; cells before its first day and after its last day are blank. Holidays outside that native month remain in the Gregorian-month holiday list, with their converted dates, and receive grid markers when their own native month is displayed. Bengali and Hijri headings show their inclusive Gregorian date range. Only 2026 official holidays are loaded. Other years show a missing-coverage message rather than claiming there are no holidays.

Sources are retained in the checked-in data and this document, and hidden in the app. Bundled records and fonts work offline after successful service-worker installation; the app requires no source website connection. No remote API or scraping runs in the browser. New years, later amendments, and moon announcements require updating the checked-in data and rebuilding.

## Interaction and checks

Three month pages use native horizontal scrolling and CSS snap points. After scrolling settles, pages rotate and recenter before paint. Buttons use the same mechanism. Reduced-motion users get immediate scrolling. There are no React renders on each pointer movement, and all month grids keep six rows at a consistent height.

Dates are static, with today highlighted. Month navigation retains the underlying day number where possible and clamps for shorter months. Today returns to the Bangladesh date. Calendar switches preserve the underlying civil date. Holiday lists show the same Gregorian-month records across calendar switches, with full dates converted into the displayed calendar.

Run `npm test` for conversion, leap-year, holiday, and grid checks, including round trips for every supported day in all systems. Use `npm run build` and `npm run preview` for production offline checks.


For the annual download, verification, data update, and offline release procedure, see [HOLIDAY_UPDATES.md](HOLIDAY_UPDATES.md).
