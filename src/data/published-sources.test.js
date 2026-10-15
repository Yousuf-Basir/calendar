import test from 'node:test'
import assert from 'node:assert/strict'
import { BANGLADESH_HOLIDAYS, HOLIDAY_METADATA, HOLIDAY_YEARS, holidayForDate } from './bangladesh-holidays.js'

test('future dates come from attributed published forecasts, never local calculations', () => {
  assert.deepEqual(HOLIDAY_YEARS, [2026, 2027, 2028, 2029, 2030])
  for (const year of [2027, 2028, 2029, 2030]) {
    const meta = HOLIDAY_METADATA[year]
    assert.equal(meta.dataKind, 'published-projection')
    assert.equal(meta.status, 'projected')
    assert.equal(meta.verifiedOn, null)
    assert.equal(meta.sources[0].url, `https://calendarific.com/holidays/${year}/BD`)
    assert.match(meta.sourceSha256, /^[a-f0-9]{64}$/)
    assert.ok(meta.sourceRowCount >= 70)
    const publishedDates = [...new Set(meta.publishedRows.map(row => row.date))].sort()
    const actual = BANGLADESH_HOLIDAYS.filter(h => h.date.startsWith(`${year}-`))
    assert.deepEqual(actual.map(h => h.date), publishedDates)
    for (const holiday of actual) {
      assert.deepEqual(holiday.publishedNames, meta.publishedRows.filter(row => row.date === holiday.date).map(row => row.name))
    }
  }
  assert.equal(holidayForDate('2031-02-21'), undefined)
  assert.equal(holidayForDate('2036-12-25'), undefined)
})

test('published source festival dates and closure spans replace calculated core-only guesses', () => {
  const dates = (year, name) => BANGLADESH_HOLIDAYS.filter(h => h.date.startsWith(`${year}-`) && h.names.some(n => n.en === name)).map(h => h.date)
  assert.deepEqual(dates(2027, 'Eid-ul-Fitr holiday'), ['2027-03-08', '2027-03-09', '2027-03-10', '2027-03-11', '2027-03-12', '2027-03-13'])
  assert.deepEqual(dates(2027, 'Eid-ul-Adha holiday'), ['2027-05-14', '2027-05-15', '2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19', '2027-05-20'])
  assert.deepEqual(dates(2027, 'Buddha Purnima'), ['2027-05-20'])
  assert.deepEqual(dates(2027, 'Janmashtami'), ['2027-08-25'])
  assert.deepEqual(dates(2027, 'Durga Puja · Navami'), ['2027-10-09'])
  assert.deepEqual(dates(2027, 'Durga Puja · Dashami'), ['2027-10-10'])
  assert.deepEqual(dates(2028, 'Buddha Purnima'), ['2028-05-08'])
  assert.deepEqual(dates(2029, 'Shab-e-Barat'), ['2029-01-01', '2029-12-22'])
  assert.deepEqual(dates(2030, 'Buddha Purnima'), ['2030-05-17'])
  assert.ok(!BANGLADESH_HOLIDAYS.some(h => h.date > '2026-12-31' && h.names.some(n => /Halloween|Valentine|Equinox|Bank Holiday|Buddha Purnima Holiday/.test(n.en))))
})
