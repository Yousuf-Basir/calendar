import { dayToDate } from './calendar.js'

export const LABELS = {
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    today: 'Today', previous: 'Previous month', next: 'Next month', holidays: 'Bangladesh holidays',
    none: 'No government holidays this month.', unavailable: 'Official holiday dates not loaded for',
    holiday: 'Government holiday', regional: 'Chittagong Hill Tracts only', weekly: 'Friday',
    confirmed: 'Bangladesh Hijri · confirmed start', estimated: 'Bangladesh Hijri · estimated dates',
    moonNote: 'Unconfirmed month boundaries are estimates; local moon sightings may change them.',
    source: 'Holiday sources', working: 'Government working day',
  },
  bn: {
    months: ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'],
    weekdays: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
    weekdayNames: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
    today: 'আজ', previous: 'আগের মাস', next: 'পরের মাস', holidays: 'বাংলাদেশের ছুটি',
    none: 'এই মাসে সরকারি ছুটি নেই।', unavailable: 'সরকারি ছুটির তথ্য নেই:',
    holiday: 'সরকারি ছুটি', regional: 'শুধু পার্বত্য তিন জেলা', weekly: 'শুক্রবার',
    source: 'ছুটির উৎস', working: 'সরকারি কর্মদিবস',
  },
  ar: {
    months: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    today: 'Today', previous: 'Previous month', next: 'Next month', holidays: 'Bangladesh holidays',
    none: 'No government holidays this month.', unavailable: 'Official holiday dates not loaded for',
    regional: 'Chittagong Hill Tracts only',
    confirmed: 'Bangladesh Hijri · confirmed start', estimated: 'Bangladesh Hijri · estimated dates',
    moonNote: 'Unconfirmed month boundaries are estimates; local moon sightings may change them.',
    working: 'Government working day',
  },
}
const formatters = {
  en: new Intl.NumberFormat('en', { useGrouping: false }),
  bn: new Intl.NumberFormat('bn-BD', { useGrouping: false }),
  ar: new Intl.NumberFormat('en', { useGrouping: false }),
}
export function formatNumber(value, language, pad = false) {
  const formatted = formatters[language].format(value)
  return pad && value < 10 ? `${formatters[language].format(0)}${formatted}` : formatted
}

export function formatGregorianRange(month) {
  const first = dayToDate(month.start)
  const last = dayToDate(month.end - 1)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
    ...(first.getUTCFullYear() !== last.getUTCFullYear() ? { year: 'numeric' } : {}),
  })
  return `${formatter.format(first)} – ${formatter.format(last)}`
}
