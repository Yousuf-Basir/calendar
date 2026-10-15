import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// Mandatory deterministic regeneration; astronomy is a pinned dev-only dependency.
test('astronomical builder reproduces committed dates and handles intercalary lunations', async () => {
  const builder = await import('./projection-builder.js')
  assert.equal(typeof builder.buildProjectedYear, 'function')
  const astronomy = createRequire(import.meta.url)('astronomy-engine')
  assert.equal(typeof builder.festivalDay, 'function')
  assert.equal(builder.festivalDay(astronomy, new Date('2027-08-25T00:00:00Z'), new Date('2027-08-25T12:00:00Z'), true), '2027-08-25', 'a tithi missing midnight stays on its calculated local day')
  const committed = JSON.parse(readFileSync(new URL('./projected-holidays.json', import.meta.url)))
  for (let year = 2026; year <= 2036; year++) {
    const result = builder.buildProjectedYear(year, astronomy)
    if (year >= 2027) assert.deepEqual(result, committed[year], `reproducible ${year}`)
    for (const id of ['buddha', 'janmashtami', 'navami', 'dashami']) {
      assert.equal(result.holidays.filter(entry => entry.ids.includes(id)).length, 1, `${year} ${id}`)
    }
    assert.ok(result.holidays.every(entry => entry.date.startsWith(`${year}-`)))
  }
  const reference = builder.buildProjectedYear(2026, astronomy).holidays
  for (const [id, date] of [['buddha', '2026-05-01'], ['janmashtami', '2026-09-04'], ['navami', '2026-10-20'], ['dashami', '2026-10-21']]) {
    assert.equal(reference.find(entry => entry.ids.includes(id)).date, date)
  }
})

test('maintainer builder calculates civil Islamic dates including two Eids in 2033', async () => {
  assert.ok(existsSync(new URL('./projection-builder.js', import.meta.url)), 'projection builder is available')
  const { islamicDate, islamicHolidays } = await import('./projection-builder.js')
  assert.equal(islamicDate(1448, 10, 1), '2027-03-10')
  assert.equal(islamicDate(1447, 10, 1), '2026-03-20')
  assert.deepEqual(islamicHolidays(2033).filter(entry => entry.ids.includes('fitr')).map(entry => entry.date), ['2033-01-03', '2033-12-23'])
})
