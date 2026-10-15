import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as data from './bangladesh-holidays.js'

const original = JSON.parse(readFileSync(new URL('./fixtures/official-2026.json', import.meta.url)))

function confirmedYear(year = 2027) {
  return {
    year, status: 'official', verifiedOn: '2026-10-08', completeAnnualList: true, reviewedBy: 'Synthetic fixture reviewer',
    sources: [{ url: 'https://www.dpp.gov.bd/upload_file/gazettes/example.pdf', label: 'Government gazette fixture' }],
    holidays: original.holidays.filter(entry => !entry.names.some(name => /Election|Solidarity|Durga Puja holiday/.test(name.en)))
      .map(entry => ({ ...entry, date: `${year}${entry.date.slice(4)}` })),
    workingDays: [`${year}-10-17`],
  }
}

test('year metadata differentiates official provenance from unverified projections', () => {
  assert.equal(data.HOLIDAY_METADATA?.[2026]?.status, 'official')
  assert.equal(data.HOLIDAY_METADATA[2026].verifiedOn, '2026-10-08')
  assert.deepEqual(data.HOLIDAY_METADATA[2026].sources, original.sources)
  for (let year = 2027; year <= 2030; year++) {
    assert.equal(data.HOLIDAY_METADATA[year].status, 'projected')
    assert.equal(data.HOLIDAY_METADATA[year].verifiedOn, null)
  }
  assert.equal(data.HOLIDAY_METADATA[2037], undefined)
})

test('complete official overrides replace a whole projected year without retaining stale dates', () => {
  assert.equal(typeof data.buildHolidayData, 'function')
  const confirmed = confirmedYear()
  const result = data.buildHolidayData({ 2027: confirmed })
  assert.equal(result.metadata[2027].status, 'official')
  assert.deepEqual(result.metadata[2027].sources, confirmed.sources)
  const actual = result.holidays.filter(entry => entry.date.startsWith('2027-'))
  assert.deepEqual(actual, confirmed.holidays.map(entry => ({ ...entry, status: 'official' })))
  assert.ok(result.workingDays.has('2027-10-17'))
  assert.ok(result.workingDays.has('2026-10-17'))
  assert.equal(result.metadata[2028].status, 'projected')
  assert.equal(confirmed.holidays[0].status, undefined, 'does not mutate imported JSON')
})

test('invalid, empty, partial and untrusted overrides are ignored atomically', () => {
  assert.equal(typeof data.validateConfirmedYear, 'function')
  assert.equal(data.validateConfirmedYear(confirmedYear(), 2027), true)
  const bad = [null, {}, { ...confirmedYear(), holidays: [] },
    { ...confirmedYear(), holidays: confirmedYear().holidays.slice(0, 3) },
    { ...confirmedYear(), year: 2028 }, { ...confirmedYear(), status: 'projected' },
    { ...confirmedYear(), verifiedOn: '2026-02-30' }, { ...confirmedYear(), sources: [] },
    { ...confirmedYear(), sources: [{ url: 'javascript:alert(1)', label: 'Bad' }] },
    { ...confirmedYear(), workingDays: ['2027-02-21'] },
    { ...confirmedYear(), holidays: [...confirmedYear().holidays, confirmedYear().holidays[0]] },
    { ...confirmedYear(), holidays: confirmedYear().holidays.map((h, i) => i ? h : { ...h, date: '2027-02-30' }) },
    { ...confirmedYear(), holidays: confirmedYear().holidays.map((h, i) => i ? h : { ...h, names: [{ en: 'Bad', bn: '' }] }) },
  ]
  for (const candidate of bad) {
    assert.equal(data.validateConfirmedYear(candidate, 2027), false)
    const result = data.buildHolidayData({ 2027: candidate })
    assert.equal(result.metadata[2027].status, 'projected')
    assert.deepEqual(result.holidays.filter(entry => entry.date.startsWith('2027-')), data.BANGLADESH_HOLIDAYS.filter(entry => entry.date.startsWith('2027-')))
  }
  assert.doesNotThrow(() => data.buildHolidayData(null))
})

test('published forecast years provide unique ISO dates and bilingual festival coverage', () => {
  assert.deepEqual(data.HOLIDAY_YEARS, [2026, 2027, 2028, 2029, 2030])
  for (let year = 2027; year <= 2030; year++) {
    const entries = data.BANGLADESH_HOLIDAYS.filter(entry => entry.date.startsWith(`${year}-`))
    assert.ok(entries.length >= 17, String(year))
    assert.equal(new Set(entries.map(entry => entry.date)).size, entries.length)
    for (const entry of entries) {
      assert.equal(new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0, 10), entry.date)
      assert.equal(entry.status, 'projected')
      assert.ok(['national', 'regional'].includes(entry.scope))
      assert.ok(entry.names.every(name => name.en.trim() && /[\u0980-\u09ff]/u.test(name.bn)))
    }
    const names = entries.flatMap(entry => entry.names.map(name => name.en))
    for (const core of ['Buddha Purnima', 'Janmashtami', 'Durga Puja · Navami', 'Durga Puja · Dashami', 'Eid-ul-Fitr holiday', 'Eid-ul-Adha holiday']) {
      assert.ok(names.includes(core), `${year}: ${core}`)
    }
    assert.ok(!names.some(name => /Election|additional|Durga Puja holiday/i.test(name)))
    assert.ok(entries.filter(entry => entry.names.some(name => name.en === 'Eid-ul-Fitr holiday')).length >= 3)
  }
  assert.equal(data.holidayForDate('2037-02-21'), undefined)
})

test('2026 official records, sources, verification date and working days are unchanged', () => {
  const entries = data.BANGLADESH_HOLIDAYS.filter(entry => entry.date.startsWith('2026-'))
  assert.deepEqual(entries.map(({ status, ...entry }) => entry), original.holidays)
  assert.ok(entries.every(entry => entry.status === 'official'))
  assert.deepEqual(data.HOLIDAY_SOURCES, original.sources)
  assert.equal(data.HOLIDAYS_VERIFIED_ON, original.verifiedOn)
  assert.deepEqual([...data.WORKING_DAYS], original.workingDays)
})
