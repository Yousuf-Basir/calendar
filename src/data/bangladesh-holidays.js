import projections from './projected-holidays.json' with { type: 'json' }
import confirmed from './confirmed-holidays.json' with { type: 'json' }

// Official nationwide general/executive holidays, plus one explicitly regional
// holiday. Optional religious leave and school/bank-only closures are excluded.
export const HOLIDAYS_VERIFIED_ON = '2026-10-08'
export const HOLIDAY_SOURCES = [
  { label: '2026 government gazette', url: 'https://www.dpp.gov.bd/upload_file/gazettes/59216_19984.pdf' },
  { label: '11–12 February election holidays', url: 'https://www.bssnews.net/national-parlament-election-2026/353742' },
  { label: '18 March additional holiday', url: 'https://mopa.gov.bd/pages/go-ultimates/আসন্ন-পবিত্র-ঈদ-উল-ফিতর-উপলক্ষ্যে-১৮-মার্চ-২০২৬-তারিখ-বুধবার-নির্বাহী-আদেশে-সরকারি-ছুটি-ঘোষণা-7rea6d-69ad3e37f681a7e2728823e8' },
  { label: '22 October holiday / 17 October working day', url: 'https://www.bssnews.net/bangla/news-flash/347353' },
  { label: '7 November additional holiday', url: 'https://mopa.gov.bd/pages/go-ultimates/6ac5e76d9594596dad446b72' },
]

const names = {
  language: { en: 'Language Martyrs’ Day', bn: 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস' },
  election: { en: 'Election holiday', bn: 'নির্বাচন উপলক্ষে ছুটি' },
  barat: { en: 'Shab-e-Barat', bn: 'শবে বরাত' },
  qadr: { en: 'Shab-e-Qadr', bn: 'শবে কদর' },
  fitr: { en: 'Eid-ul-Fitr holiday', bn: 'ঈদুল ফিতরের ছুটি' },
  jumuat: { en: 'Jumatul Bida', bn: 'জুমাতুল বিদা' },
  independence: { en: 'Independence Day', bn: 'স্বাধীনতা ও জাতীয় দিবস' },
  chaitra: { en: 'Chaitra Sankranti', bn: 'চৈত্র সংক্রান্তি' },
  newYear: { en: 'Bengali New Year', bn: 'বাংলা নববর্ষ' },
  may: { en: 'May Day', bn: 'মে দিবস' },
  buddha: { en: 'Buddha Purnima', bn: 'বুদ্ধ পূর্ণিমা' },
  adha: { en: 'Eid-ul-Adha holiday', bn: 'ঈদুল আজহার ছুটি' },
  ashura: { en: 'Ashura', bn: 'আশুরা' },
  uprising: { en: 'July Uprising Day', bn: 'জুলাই গণঅভ্যুত্থান দিবস' },
  milad: { en: 'Eid-e-Miladunnabi', bn: 'ঈদে মিলাদুন্নবী' },
  janmashtami: { en: 'Janmashtami', bn: 'জন্মাষ্টমী' },
  navami: { en: 'Durga Puja · Navami', bn: 'দুর্গাপূজা · নবমী' },
  dashami: { en: 'Durga Puja · Dashami', bn: 'দুর্গাপূজা · বিজয়া দশমী' },
  pujaExtra: { en: 'Durga Puja holiday', bn: 'দুর্গাপূজার অতিরিক্ত ছুটি' },
  solidarity: { en: 'National Revolution and Solidarity Day', bn: 'জাতীয় বিপ্লব ও সংহতি দিবস' },
  victory: { en: 'Victory Day', bn: 'বিজয় দিবস' },
  christmas: { en: 'Christmas Day', bn: 'বড়দিন' },
}

const entries = [
  ['02-04', ['barat']], ['02-11', ['election']], ['02-12', ['election']], ['02-21', ['language']],
  ['03-17', ['qadr']], ['03-18', ['fitr']], ['03-19', ['fitr']], ['03-20', ['jumuat', 'fitr']],
  ['03-21', ['fitr']], ['03-22', ['fitr']], ['03-23', ['fitr']], ['03-26', ['independence']],
  ['04-13', ['chaitra'], 'regional'], ['04-14', ['newYear']], ['05-01', ['may', 'buddha']],
  ['05-26', ['adha']], ['05-27', ['adha']], ['05-28', ['adha']], ['05-29', ['adha']],
  ['05-30', ['adha']], ['05-31', ['adha']], ['06-26', ['ashura']], ['08-05', ['uprising']],
  ['08-26', ['milad']], ['09-04', ['janmashtami']], ['10-20', ['navami']], ['10-21', ['dashami']],
  ['10-22', ['pujaExtra']], ['11-07', ['solidarity']], ['12-16', ['victory']], ['12-25', ['christmas']],
]

function validIso(date, year) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    && (year === undefined || Number(date.slice(0, 4)) === year)
}


// Fail closed: an amendment or a few dates are not a complete annual gazette.
// This is a structural/completeness gate, NOT proof of official publication.
// Maintainers still need to check every record against the supplied sources.
export function validateConfirmedYear(value, year = value?.year) {
  if (!value || typeof value !== 'object' || !Number.isInteger(year) || year < 2020 || year > 2100
    || value.year !== year || value.status !== 'official' || !validIso(value.verifiedOn)
    || value.verifiedOn > new Date().toISOString().slice(0, 10)
    || value.completeAnnualList !== true || typeof value.reviewedBy !== 'string' || !value.reviewedBy.trim()
    || !Array.isArray(value.sources) || !value.sources.length
    || !Array.isArray(value.holidays) || value.holidays.length < 10 || !Array.isArray(value.workingDays)) return false
  if (!value.sources.every(source => {
    if (!source || typeof source.label !== 'string' || !source.label.trim()) return false
    try {
      const url = new URL(source.url)
      return url.protocol === 'https:' && !url.username && !url.password && !url.port
        && (url.hostname.endsWith('.gov.bd') || url.hostname === 'gov.bd')
    } catch { return false }
  })) return false
  if (!value.holidays.every(holiday => holiday && validIso(holiday.date, year)
    && ['national', 'regional'].includes(holiday.scope)
    && (holiday.status === undefined || holiday.status === 'official')
    && Array.isArray(holiday.names) && holiday.names.length > 0
    && holiday.names.every(name => name && typeof name.en === 'string' && name.en.trim()
      && typeof name.bn === 'string' && /[\u0980-\u09ff]/u.test(name.bn)))) return false
  const dates = new Set(value.holidays.map(holiday => holiday.date))
  if (dates.size !== value.holidays.length || new Set(value.workingDays).size !== value.workingDays.length
    || !value.workingDays.every(date => validIso(date, year) && !dates.has(date))) return false
  return new Set(value.holidays.map(holiday => holiday.date.slice(5, 7))).size >= 6
}

export function buildHolidayData(overrides = confirmed) {
  const years = {
    2026: {
      year: 2026, status: 'official', verifiedOn: HOLIDAYS_VERIFIED_ON, sources: HOLIDAY_SOURCES,
      holidays: entries.map(([date, ids, scope = 'national']) => ({
        date: `2026-${date}`, names: ids.map(id => ({ ...names[id] })), scope, status: 'official',
      })),
      workingDays: ['2026-10-17'],
    },
    ...Object.fromEntries(Object.entries(projections).map(([year, projection]) => [year, {
      ...projection, verifiedOn: null,
      holidays: projection.holidays.map(({ ids, ...holiday }) => ({ ...holiday, names: ids.map(id => ({ ...names[id] })) })),
    }])),
  }
  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    for (const [key, value] of Object.entries(overrides)) {
      const year = Number(key)
      if (String(year) !== key || !validateConfirmedYear(value, year)) continue
      years[year] = {
        year, status: 'official', verifiedOn: value.verifiedOn,
        completeAnnualList: true, reviewedBy: value.reviewedBy,
        sources: value.sources.map(({ label, url }) => ({ label, url })),
        holidays: value.holidays.map(holiday => ({
          date: holiday.date, names: holiday.names.map(({ en, bn }) => ({ en, bn })), scope: holiday.scope, status: 'official',
        })),
        workingDays: [...value.workingDays],
      }
    }
  }
  const sorted = Object.values(years).sort((a, b) => a.year - b.year)
  return {
    holidays: sorted.flatMap(year => year.holidays),
    workingDays: new Set(sorted.flatMap(year => year.workingDays)),
    metadata: Object.fromEntries(sorted.map(({ holidays, workingDays, ...metadata }) => [metadata.year, metadata])),
  }
}

const dataset = buildHolidayData()
export const BANGLADESH_HOLIDAYS = dataset.holidays
export const WORKING_DAYS = dataset.workingDays
export const HOLIDAY_METADATA = dataset.metadata
export const HOLIDAY_YEARS = Object.keys(HOLIDAY_METADATA).map(Number)
const byDate = new Map(BANGLADESH_HOLIDAYS.map((entry) => [entry.date, entry]))
export function holidayForDate(iso) {
  return byDate.get(iso)
}
export function holidayName(holiday, language) {
  return holiday.names.map((name) => name[language]).join(' · ')
}
