const DAY_MS = 86_400_000
export const MIN_DAY = isoToDay('2020-01-01')
export const MAX_DAY = isoToDay('2100-12-31')

export function isoToDay(iso) {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS)
}
export function dayToIso(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}
export function dayToDate(day) {
  return new Date(day * DAY_MS)
}
export function todayInBangladesh(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const value = (type) => parts.find((part) => part.type === type).value
  return isoToDay(`${value('year')}-${value('month')}-${value('day')}`)
}
export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}
export function weekdayIndex(day) {
  return dayToDate(day).getUTCDay() // Sunday first; Friday is always 5.
}

function bengaliLengths(year) {
  // Falgun falls in the Gregorian year AFTER the Bengali new year.
  return [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeapYear(year + 594) ? 30 : 29, 30]
}

export function monthStart(year, month, system) {
  const serial = year * 12 + month
  year = Math.floor(serial / 12)
  month = ((serial % 12) + 12) % 12
  if (system === 'bn') {
    const start = Math.floor(Date.UTC(year + 593, 3, 14) / DAY_MS)
    return start + bengaliLengths(year).slice(0, month).reduce((total, length) => total + length, 0)
  }
  return Math.floor(Date.UTC(year, month, 1) / DAY_MS)
}

export function calendarParts(day, system) {
  const date = dayToDate(day)
  if (system === 'bn') {
    const gregorianYear = date.getUTCFullYear()
    const newYear = Math.floor(Date.UTC(gregorianYear, 3, 14) / DAY_MS)
    const year = gregorianYear - (day >= newYear ? 593 : 594)
    let remaining = day - monthStart(year, 0, 'bn')
    const lengths = bengaliLengths(year)
    let month = 0
    while (remaining >= lengths[month]) remaining -= lengths[month++]
    return { year, month, day: remaining + 1 }
  }
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() }
}

export function calendarMonth(day, system) {
  const { year, month } = calendarParts(day, system)
  const start = monthStart(year, month, system)
  const end = monthStart(year, month + 1, system)
  return { year, month, start, end, length: end - start, key: `${system}-${year}-${month}` }
}
export function shiftMonth(day, system, direction) {
  const parts = calendarParts(day, system)
  const start = monthStart(parts.year, parts.month + direction, system)
  const end = monthStart(parts.year, parts.month + direction + 1, system)
  return Math.max(MIN_DAY, Math.min(MAX_DAY, start + Math.min(parts.day, end - start) - 1))
}
export function canShiftMonth(day, system, direction) {
  const current = calendarMonth(day, system)
  const next = calendarMonth(shiftMonth(day, system, direction), system)
  return next.key !== current.key
}
export function monthCells(month) {
  const offset = weekdayIndex(month.start)
  return Array.from({ length: 42 }, (_, index) => {
    const day = month.start - offset + index
    return day >= month.start && day < month.end ? day : null
  })
}
