import { readLanguage, saveLanguage, LANGUAGE_STORAGE_KEY } from '../i18n/ui.js'
import { formatGregorianRange, LABELS, calendarLabels } from './labels.js'
import { holidayPeriod } from './holidays.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calendarMonth, calendarParts, canShiftMonth, dayToIso, isoToDay, MAX_DAY,
  MIN_DAY, monthCells, monthStart, shiftMonth, todayInBangladesh, weekdayIndex,
} from './calendar.js'
import { holidayForDate, HOLIDAY_YEARS, WORKING_DAYS } from '../data/bangladesh-holidays.js'

test('Bangladesh date changes at Dhaka midnight, independent of device timezone', () => {
  assert.equal(dayToIso(todayInBangladesh(new Date('2026-10-08T17:59:59Z'))), '2026-10-08')
  assert.equal(dayToIso(todayInBangladesh(new Date('2026-10-08T18:00:00Z'))), '2026-10-09')
})

test('Bengali reform aligns New Year and national days, including leap years', () => {
  const fixtures = [
    ['2026-04-13', 1432, 11, 30], ['2026-04-14', 1433, 0, 1],
    ['2026-02-21', 1432, 10, 8], ['2026-03-26', 1432, 11, 12],
    ['2026-12-16', 1433, 8, 1], ['2026-10-16', 1433, 5, 31],
    ['2026-10-17', 1433, 6, 1], ['2024-03-14', 1430, 10, 30],
    ['2024-03-15', 1430, 11, 1], ['2100-03-14', 1506, 10, 29],
  ]
  for (const [date, year, month, day] of fixtures) {
    assert.deepEqual(calendarParts(isoToDay(date), 'bn'), { year, month, day }, date)
  }
})

test('confirmed Bangladesh Hijri dates match the local announcements', () => {
  const fixtures = [
    ['2026-02-19', 1447, 8, 1], ['2026-03-20', 1447, 8, 30],
    ['2026-03-21', 1447, 9, 1], ['2026-04-19', 1447, 9, 30],
    ['2026-04-20', 1447, 10, 1], ['2026-05-28', 1447, 11, 10],
    ['2026-06-17', 1448, 0, 1], ['2026-06-26', 1448, 0, 10],
    ['2026-08-26', 1448, 2, 12], ['2026-09-13', 1448, 3, 1],
  ]
  for (const [date, year, month, day] of fixtures) {
    assert.deepEqual(calendarParts(isoToDay(date), 'ar'), { year, month, day }, date)
  }
  assert.equal(calendarMonth(isoToDay('2026-10-08'), 'ar').confirmed, true)
  assert.equal(calendarMonth(isoToDay('2026-10-08'), 'ar').lengthConfirmed, false)
  assert.equal(calendarMonth(isoToDay('2026-12-01'), 'ar').confirmed, false)
})

test('all supported days round-trip and months remain contiguous in all systems', () => {
  for (const system of ['en', 'bn', 'ar']) {
    for (let day = MIN_DAY; day <= MAX_DAY; day++) {
      const parts = calendarParts(day, system)
      const start = monthStart(parts.year, parts.month, system)
      const end = monthStart(parts.year, parts.month + 1, system)
      assert.equal(start + parts.day - 1, day, `${system} ${dayToIso(day)}`)
      assert.ok(day >= start && day < end)
      if (parts.day === 1) {
        const minimum = system === 'en' ? 28 : 29
        const maximum = system === 'ar' ? 30 : 31
        assert.ok(end - start >= minimum && end - start <= maximum, `${system} month length ${end - start}`)
      }
    }
  }
})

test('month navigation clamps the day and respects year and range boundaries', () => {
  assert.equal(dayToIso(shiftMonth(isoToDay('2024-01-31'), 'en', 1)), '2024-02-29')
  assert.equal(dayToIso(shiftMonth(isoToDay('2026-01-31'), 'en', 1)), '2026-02-28')
  assert.equal(dayToIso(shiftMonth(isoToDay('2026-12-08'), 'en', 1)), '2027-01-08')
  const bangla = calendarParts(shiftMonth(isoToDay('2026-04-13'), 'bn', 1), 'bn')
  assert.deepEqual(bangla, { year: 1433, month: 0, day: 30 })
  for (const system of ['en', 'bn', 'ar']) {
    assert.equal(canShiftMonth(MIN_DAY, system, -1), false)
    assert.equal(canShiftMonth(MAX_DAY, system, 1), false)
  }
})

test('grid places actual Fridays in the red column in every calendar', () => {
  for (const system of ['en', 'bn', 'ar']) {
    const cells = monthCells(calendarMonth(isoToDay('2026-10-08'), system))
    assert.equal(cells.length, 42)
    cells.forEach((day, index) => {
      if (day !== null) assert.equal(weekdayIndex(day), index % 7)
    })
    assert.ok(cells.filter((day, index) => day !== null && index % 7 === 5).length >= 4)
  }
})

test('holiday data includes amendments without treating optional or regional leave as nationwide', () => {
  for (const date of ['2026-02-11', '2026-02-12', '2026-03-18', '2026-10-22', '2026-11-07']) {
    assert.equal(holidayForDate(date).scope, 'national', date)
  }
  assert.equal(holidayForDate('2026-04-13').scope, 'regional')
  assert.equal(holidayForDate('2026-05-01').names.length, 2)
  assert.equal(holidayForDate('2026-03-24'), undefined)
  assert.equal(holidayForDate('2026-01-01'), undefined)
  assert.ok(WORKING_DAYS.has('2026-10-17'))
  assert.equal(HOLIDAY_YEARS.includes(2027), false)
})


test('holiday lists follow the displayed Gregorian, Bengali and Hijri month', () => {
  const october = isoToDay('2026-10-08')
  assert.deepEqual(holidayPeriod(october, 'en').holidays.map(({ date }) => date),
    ['2026-10-20', '2026-10-21', '2026-10-22'])
  for (const system of ['bn', 'ar']) {
    const current = holidayPeriod(october, system)
    assert.deepEqual(current.holidays, [], system)
    assert.deepEqual(current.workingDays, [], system)
    const next = holidayPeriod(current.month.end, system)
    assert.ok(next.holidays.some(({ date }) => date === '2026-10-20'), system)
    assert.deepEqual(next.workingDays, ['2026-10-17'], system)
    for (const period of [current, next]) {
      for (const date of [...period.holidays.map(({ date }) => date), ...period.workingDays]) {
        const day = isoToDay(date)
        assert.ok(day >= period.month.start && day < period.month.end, system + ' ' + date)
        const parts = calendarParts(day, system)
        assert.equal(parts.month, period.month.month)
        assert.equal(parts.year, period.month.year)
      }
    }
  }
  // The same Bengali month must yield the same list on either side of November 1.
  assert.deepEqual(holidayPeriod(isoToDay('2026-10-17'), 'bn'),
    holidayPeriod(isoToDay('2026-11-08'), 'bn'))
})

test('holiday coverage checks Gregorian years across native month boundaries', () => {
  for (const system of ['bn', 'ar']) {
    const period = holidayPeriod(isoToDay('2026-12-31'), system)
    assert.ok(period.month.start < isoToDay('2027-01-01'))
    assert.ok(period.month.end > isoToDay('2027-01-01'))
    assert.deepEqual(period.missingYears, [2027])
    assert.deepEqual(holidayPeriod(isoToDay('2026-10-08'), system).missingYears, [])
  }
})

test('Sunday-first grids show exactly the current month in all three calendars', () => {
  for (const system of ['en', 'bn', 'ar']) {
    assert.equal(LABELS[system].weekdayNames[5], system === 'bn' ? 'শুক্রবার' : 'Friday')
    for (let gregorianMonth = 1; gregorianMonth <= 12; gregorianMonth++) {
      const month = calendarMonth(isoToDay(`2026-${String(gregorianMonth).padStart(2, '0')}-08`), system)
      const cells = monthCells(month)
      const dates = cells.filter((day) => day !== null)
      assert.equal(cells.length, 42)
      assert.equal(dates.length, month.length)
      assert.equal(dates[0], month.start)
      assert.equal(dates.at(-1), month.end - 1)
      assert.equal(cells.indexOf(month.start), weekdayIndex(month.start))
      dates.forEach((day, index) => {
        assert.equal(day, month.start + index)
        assert.equal(calendarParts(day, system).month, month.month)
      })
    }
  }
})

test('English month ranges use inclusive boundaries and show years across New Year', () => {
  assert.equal(formatGregorianRange(calendarMonth(isoToDay('2026-10-08'), 'bn')), '16 Sept – 16 Oct')
  assert.equal(formatGregorianRange(calendarMonth(isoToDay('2026-10-08'), 'ar')), '13 Sept – 11 Oct')
  assert.equal(formatGregorianRange({ start: isoToDay('2026-12-16'), end: isoToDay('2027-01-16') }), '16 Dec 2026 – 15 Jan 2027')
})

test('app language persists and safely defaults when storage is unavailable or invalid', () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  assert.equal(readLanguage(storage), 'en')
  saveLanguage(storage, 'bn')
  assert.equal(readLanguage(storage), 'bn')
  values.set(LANGUAGE_STORAGE_KEY, 'invalid')
  assert.equal(readLanguage(storage), 'en')
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.equal(readLanguage(blocked), 'en')
  assert.doesNotThrow(() => saveLanguage(blocked, 'bn'))
})

test('Bangla app language localizes all calendar systems without changing their dates', () => {
  for (const system of ['en', 'bn', 'ar']) {
    const labels = calendarLabels(system, 'bn')
    assert.equal(labels.months.length, 12)
    assert.equal(labels.today, 'আজকের তারিখ দেখুন')
    assert.equal(labels.weekdayNames[5], 'শুক্রবার')
    assert.ok(labels.months.every(name => /[\u0980-\u09ff]/u.test(name)))
    assert.doesNotMatch(formatGregorianRange(calendarMonth(isoToDay('2026-10-09'), system), 'bn'), /[A-Za-z0-9]/)
  }
  assert.equal(calendarLabels('en', 'bn').months[9], 'অক্টোবর')
  assert.equal(calendarLabels('ar', 'bn').months[8], 'রমজান')
})
