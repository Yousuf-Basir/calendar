// Maintainer-only generator. NOT imported by the app. Astronomy is injected so
// astronomy-engine (MIT, 2.1.19) never becomes a browser dependency.
const DAY = 86400000
const iso = time => new Date(time).toISOString().slice(0, 10)
const entry = (date, id, basis, scope = 'national') => ({ date, ids: [id], scope, status: 'projected', basis })

// Tabular Islamic civil calendar: Friday epoch, 30-year leap cycle. This does
// NOT predict Bangladesh's crescent-sighting decision (often 1–2 days later).
export function islamicDate(year, month, day) {
  const jd = day + Math.ceil(29.5 * (month - 1)) + 354 * (year - 1)
    + Math.floor((3 + 11 * year) / 30) + 1948439.5 - 1
  return iso((jd - 2440587.5) * DAY)
}

export function islamicHolidays(year) {
  const result = []
  for (let hijri = year - 580; hijri <= year - 560; hijri++) {
    for (const [month, day, id] of [[8, 15, 'barat'], [9, 27, 'qadr'], [10, 1, 'fitr'], [12, 10, 'adha'], [1, 10, 'ashura'], [3, 12, 'milad']]) {
      const date = islamicDate(hijri, month, day)
      if (date.startsWith(`${year}-`)) result.push(entry(date, id, 'tabular-islamic'))
    }
    // Last Friday of Ramadan, not a fixed offset from Eid.
    const end = Date.parse(`${islamicDate(hijri, 10, 1)}T00:00:00Z`) - DAY
    const friday = end - ((new Date(end).getUTCDay() + 2) % 7) * DAY
    if (iso(friday).startsWith(`${year}-`)) result.push(entry(iso(friday), 'jumuat', 'tabular-islamic'))
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

// Mean Lahiri ayanamsa near J2000, advanced at 50.29 arcsec/year. This
// approximation is only used to name lunations, not to time lunar phases.
// Astronomical tithis and Dhaka sunrise are calculated by Astronomy Engine.
function solarSign(astronomy, time) {
  const years = (time.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.2425 * DAY)
  const ayanamsa = 23.853055 + years * 50.29 / 3600
  return Math.floor(((astronomy.SunPosition(time).elon - ayanamsa + 360) % 360) / 30)
}

export function festivalDay(astronomy, start, end, midnight = false) {
  const observer = new astronomy.Observer(23.8103, 90.4125, 0)
  const first = Date.parse(`${iso(start.getTime() + 6 * 3600000)}T00:00:00Z`)
  for (let civil = first; civil <= end.getTime() + DAY; civil += DAY) {
    // Janmashtami uses the midnight of the festival's evening; the others use
    // sunrise. No claim is made to reproduce every local panjika priority rule.
    const instant = midnight ? civil + 18 * 3600000
      : astronomy.SearchRiseSet('Sun', observer, +1, new Date(civil - 6 * 3600000), 1)?.date.getTime()
    if (instant >= start.getTime() && instant < end.getTime()) return iso(civil)
  }
  // A short (ksaya) tithi can miss sunrise. Use its local starting day,
  // explicitly projected, rather than silently omitting the festival.
  return iso(start.getTime() + 6 * 3600000)
}

export function buildProjectedYear(year, astronomy) {
  const holidays = islamicHolidays(year)
  for (const [date, id, scope] of [
    ['02-21', 'language'], ['03-26', 'independence'], ['04-13', 'chaitra', 'regional'],
    ['04-14', 'newYear'], ['05-01', 'may'], ['08-05', 'uprising'],
    ['12-16', 'victory'], ['12-25', 'christmas'],
  ]) holidays.push(entry(`${year}-${date}`, id, 'fixed-policy', scope))

  let start = astronomy.SearchMoonPhase(0, new Date(Date.UTC(year - 1, 11, 1)), 40).date
  while (start.getUTCFullYear() <= year) {
    const end = astronomy.SearchMoonPhase(0, new Date(start.getTime() + DAY), 40).date
    const sign = solarSign(astronomy, start)
    const leap = sign === solarSign(astronomy, end)
    const month = (sign + 1) % 12 + 1 // Chaitra=1, Vaisakha=2, ...
    if (!leap) {
      for (const [wanted, angle, id, midnight] of [[2, 168, 'buddha'], [5, 264, 'janmashtami', true], [7, 96, 'navami'], [7, 108, 'dashami']]) {
        if (month !== wanted) continue
        const from = astronomy.SearchMoonPhase(angle, start, 30).date
        const to = astronomy.SearchMoonPhase((angle + 12) % 360, from, 3).date
        const date = festivalDay(astronomy, from, to, midnight)
        if (date.startsWith(`${year}-`)) holidays.push(entry(date, id, 'astronomical-tithi'))
      }
    }
    start = end
  }
  // Collisions retain every holiday name, but never duplicate a calendar day.
  const merged = new Map()
  for (const holiday of holidays.sort((a, b) => a.date.localeCompare(b.date))) {
    const existing = merged.get(holiday.date)
    if (existing) {
      existing.ids.push(...holiday.ids)
      existing.basis = [...new Set([...existing.basis.split('+'), holiday.basis])].join('+')
      if (holiday.scope === 'national') existing.scope = 'national'
    } else merged.set(holiday.date, { ...holiday, ids: [...holiday.ids] })
  }
  for (const id of ['buddha', 'janmashtami', 'navami', 'dashami']) {
    if ([...merged.values()].filter(holiday => holiday.ids.includes(id)).length !== 1) {
      throw Error(`Cannot calculate exactly one ${id} for ${year}; inspect lunar-month rules`)
    }
  }
  return { year, status: 'projected', method: 'civil-islamic+dhaka-tithi-v1', holidays: [...merged.values()], workingDays: [] }
}
