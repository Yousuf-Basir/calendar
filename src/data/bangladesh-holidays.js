// Official nationwide general/executive holidays, plus one explicitly regional
// holiday. Optional religious leave and school/bank-only closures are excluded.
export const HOLIDAY_YEARS = [2026]
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

export const BANGLADESH_HOLIDAYS = entries.map(([date, ids, scope = 'national']) => ({
  date: `2026-${date}`, names: ids.map((id) => names[id]), scope,
}))
export const WORKING_DAYS = new Set(['2026-10-17'])
const byDate = new Map(BANGLADESH_HOLIDAYS.map((entry) => [entry.date, entry]))
export function holidayForDate(iso) {
  return byDate.get(iso)
}
export function holidayName(holiday, language) {
  return holiday.names.map((name) => name[language]).join(' · ')
}
