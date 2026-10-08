# Updating Bangladesh holiday data

Maintenance guide for this app, written 8 October 2026. The next annual update is for 2027; use the same process for later years.

## How updates work today

The app does **not** fetch holidays from the internet. It bundles verified records in `src/data/bangladesh-holidays.js` and includes them in its JavaScript build. The service worker caches that build for offline use. To add a year, download the official documents, update the records, test, rebuild, and publish the app. Users receive the new data when they open the updated app online; they can then use it offline.

Keep one Gregorian date for each holiday. `calendarParts()` converts it to Bangladesh's Bengali calendar or the Bangladesh Hijri calendar. Do not create separate holiday datasets for the three views.

The holiday list uses the Gregorian month containing the browsed date in every view. Its heading identifies that month. The native calendar grid keeps its own month boundaries, so a listed holiday can belong to the following Bengali or Hijri month. Grid markers appear only on the actual matching date.

## 1. Find and download the official list

Start with the Ministry of Public Administration's [Government holidays page](https://mopa.gov.bd/pages/public-holiday/). Check its [archived holiday notices](https://mopa.gov.bd/pages/public-holiday?archived=true&page=1&page_size=10) if necessary. The archived listing inspected for this guide identifies the 2026 annual notification as published on 9 November 2025; that is an example, not a promised publication date for future years.

Search for the target year's notification, for example:

- `site:mopa.gov.bd ২০২৭ খ্রিষ্টাব্দের ছুটির তালিকার প্রজ্ঞাপন`
- `site:mopa.gov.bd ২০২৭ সরকারি ছুটি`
- `site:dpp.gov.bd ২০২৭ ছুটির তালিকা`

Open the notice and follow its actual attachment link. Government attachment filenames and URLs can change; do not obtain 2027's document by replacing “2026” in an old URL. The [Department of Printing and Publications](https://www.dpp.gov.bd/) is another place to check the gazette. The [2026 gazette used by this project](https://www.dpp.gov.bd/upload_file/gazettes/59216_19984.pdf) is a reference for document format, not next year's data.

Save the PDF locally, preferably under `docs/holiday-sources/2027/`, with its notice URL, publication date, order/reference number, and the date you checked it. These files can remain repository documentation; they do not need to ship inside the app.

If downloading through PowerShell, use the verified attachment URL from the notice:

```powershell
New-Item -ItemType Directory -Force -Path docs/holiday-sources/2027
# Replace the placeholder with the actual PDF attachment URL.
$holidayPdfUrl = 'PASTE_VERIFIED_ATTACHMENT_URL_HERE'
Invoke-WebRequest -Uri $holidayPdfUrl -OutFile docs/holiday-sources/2027/annual-holidays.pdf
```

Do not mark the year as loaded until the complete annual list has been checked. This guide does not supply verified 2027 dates.

## 2. Check the document and later amendments

Confirm that the document covers Bangladesh government offices for the intended year. School calendars, bank closures, embassy calendars, and West Bengal calendars have different scopes.

Read the general holidays and holidays declared by executive order. Also inspect the document's notes and regional provisions. For this app:

- Include nationwide general and executive-order holidays.
- Include an explicitly regional holiday only with `scope: 'regional'` and a suitable regional label. The current UI's regional label means the three Chittagong Hill Tracts districts; adding a different region requires updating that model and label.
- Exclude optional personal religious leave and school- or bank-only closures.
- Do not add every Friday or Saturday as a government holiday. Fridays already have their own red column.
- Expand multi-day holiday periods into one entry per Gregorian date.
- Combine two holiday names that fall on one date into the same entry.
- Record exceptional working days separately in `WORKING_DAYS`.

Recheck the Ministry's [orders](https://mopa.gov.bd/pages/go-ultimates) and holiday notices for later additions, cancellations, date changes, and replacement working days. Use the final published order when announcements differ. Annual religious holiday dates may later be amended following local moon sightings; read the notice's conditions rather than treating forecast dates as final.

An example of an amendment is the 2026 Durga Puja adjustment: 22 October became an additional holiday and 17 October became a working day. [Bangladesh Sangbad Sangstha's report of the notification](https://www.bssnews.net/others/432289) explains the change. Such one-off entries must not be copied automatically into the next year.

PDF extraction or OCR can help draft the records, but visually compare every date and name against the PDF. Bengali digits, table columns, date ranges, and footnotes are easy to misread.

## 3. Update the holiday file without losing older years

Edit `src/data/bangladesh-holidays.js`.

The current implementation has a single `entries` array containing `MM-DD` strings, then prefixes every date with `2026-`. **Adding 2027 to `HOLIDAY_YEARS` alone is insufficient.** Changing that prefix to 2027 would also wrongly move all existing holidays into the new year.

Retain the 2026 records and give each year its own verified entries. A minimal future implementation can replace the existing array-to-record mapping with this pattern:

```js
// Rename the current entries array to entries2026, preserving its contents.
const entries2026 = [/* existing verified 2026 entries */]
const entries2027 = [/* complete verified 2027 entries */]

const entriesByYear = {
  2026: entries2026,
  2027: entries2027,
}

export const HOLIDAY_YEARS = Object.keys(entriesByYear).map(Number)
export const BANGLADESH_HOLIDAYS = Object.entries(entriesByYear)
  .flatMap(([year, entries]) => entries.map(([date, ids, scope = 'national']) => ({
    date: `${year}-${date}`,
    names: ids.map((id) => names[id]),
    scope,
  })))
  .sort((a, b) => a.date.localeCompare(b.date))
```

This is a structural example, not a complete replacement file. Replace the placeholders with real records and replace the original declarations rather than declaring duplicate exports. Add the 2027 key only after its annual list is complete; an empty year would make the UI incorrectly say there are no holidays.

Reuse the existing `names` keys where appropriate. An entry has the format:

```js
['MM-DD', ['holidayNameKey']]             // nationwide
['MM-DD', ['firstKey', 'secondKey']]      // two names on one date
['MM-DD', ['holidayNameKey'], 'regional'] // restricted scope
```

New names need English and Bangla translations. Existing name objects also retain an `ar` field; preserve that shape when adding names, although the Hijri view currently displays English.

Keep `WORKING_DAYS` as full ISO dates, retaining historical entries and adding only next year's explicitly ordered exceptions. Update `HOLIDAYS_VERIFIED_ON` to your actual review date. Add the annual PDF and amendment URLs to `HOLIDAY_SOURCES`, clearly identifying the year. These sources remain hidden in the UI.

Keep dates unique across `BANGLADESH_HOLIDAYS`: `holidayForDate()` builds a map with one record per ISO date. Duplicate rows would cause the map to keep only one while the list renders both.

## 4. Update Bangladesh Hijri observations separately

Government holiday dates and Hijri month boundaries are separate inputs. Adding next year's Gregorian holidays automatically gives them Bengali dates. It also gives them Hijri dates, but future Hijri boundaries remain estimates until observed starts are added.

Use Bangladesh's National Moon Sighting Committee announcements, available through the [Islamic Foundation](https://islamicfoundation.gov.bd/) and official reports. Add confirmed month starts to `src/data/bangladesh-moon-starts.js`, with the supporting source URL, and update `MOON_STARTS_VERIFIED_ON`.

Each entry records the **first civil daytime date** of the month, not the preceding sunset:

```js
{ year: HIJRI_YEAR, month: ZERO_BASED_MONTH, date: 'YYYY-MM-DD', source: 'VERIFIED_URL' }
```

Month indices run from `0` for Muharram to `11` for Dhu al-Hijjah. Keep entries chronological and avoid duplicate year/month pairs. Do not insert Saudi calendar dates or arithmetic forecasts as confirmed Bangladesh observations. Preserve the UI's estimate wording for unconfirmed boundaries.

If a new observation changes a previously estimated conversion, update affected forecast-based test expectations using the announcement as evidence. Do not change confirmed-date fixtures merely to make tests pass.

## 5. Validate the update

From the project folder:

```powershell
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Add assertions to `src/calendar/calendar.test.js` using several dates taken directly from the new documents: a fixed national holiday, a religious holiday, an amendment if available, a regional entry if present, and any replacement working day. Check that 2026 records remain available and 2027 appears in `HOLIDAY_YEARS`. Check unique valid ISO dates, valid name keys, and chronological records.

In the production preview:

1. Browse to months with verified next-year holidays.
2. Switch between English, Bangla, and Arabic. The same Gregorian-month holidays should remain listed, with converted dates and correct language.
3. Confirm that red dots match actual civil dates inside each native grid. A holiday outside the native month should remain in the list without being assigned to an unrelated cell.
4. Check Bengali New Year, February/leap-year conversions, year boundaries, Friday columns, and month swiping.
5. Visit an unloaded year and confirm the missing-data message still appears.
6. Open the production app online in Chrome, allow its service worker to install, then reload offline and switch all three views. Verify holidays, fonts, and month navigation still work.

Vite development mode is not the release offline check. Use the production build and preview.

## 6. Publish and refresh offline clients

Before building the release, give `CACHE_NAME` in `public/sw.js` a new unique version, such as `calendar-shell-2027-r1`. Use a new version for subsequent amendments too. `vite.config.js` injects the newly hashed JavaScript, CSS, and local font files into the built worker's asset list.

Publish the whole `dist/` directory together, including `sw.js`, `index.html`, and all assets. Do not upload only the edited source file. Configure hosting so `sw.js` and `index.html` are revalidated rather than held in a long-lived HTTP/CDN cache; hashed assets can have long cache lifetimes.

Users who remain offline keep their previously installed data. They need an online visit for the browser to discover and install the new worker, then a reload to show the new application data. Verify that sequence on an existing installation as well as a fresh browser profile. Keep the preceding release available for rollback.

After publishing, note the dataset year, review date, release version, and supporting orders in a short maintenance log. Recheck amendments during the year, especially around religious holidays; annual publication is not the last possible update.

## Optional future automatic fetching

For this small offline app, the manual verified-data release above is the recommended starting point. If automatic updates are later needed, add a separate maintainer pipeline that downloads official documents and produces reviewed, versioned JSON. Serve that JSON from the app's own origin.

The browser can then fetch it when online, validate its schema/year/unique dates, and save a successfully validated complete dataset in IndexedDB. It must retain the last good data and bundled fallback when a request fails, never replace records with an empty or partial response, and avoid falsely marking a year as covered. The UI would also need to read this saved dataset; simply adding a fetch call does not change the current static imports.

Keep moon observations separately versioned. Official PDF pages are not a guaranteed stable JSON API, and scraping them directly from the browser creates parsing, cross-origin, and offline problems. This optional pipeline is a future feature; it has not been implemented by this documentation update.
