import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildHolidayData, validateConfirmedYear } from './bangladesh-holidays.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
// Explicitly synthetic source bytes/URLs; no network or real gazette assertions.
function withReview(check) {
  const folder = mkdtempSync(join(tmpdir(), 'calendar-updater-fixture-'))
  try {
    const setup = spawnSync('python3', ['-c', `import sys; sys.path.insert(0, 'scripts'); from test_holiday_updater import ApplyTests; print(ApplyTests().fixture(sys.argv[1])[1])`, folder], { cwd: root, encoding: 'utf8' })
    assert.equal(setup.status, 0, setup.stderr)
    const review = setup.stdout.trim()
    const destination = join(folder, 'confirmed.json')
    const original = JSON.parse(readFileSync(review, 'utf8'))
    const apply = candidate => {
      writeFileSync(review, JSON.stringify(candidate))
      return spawnSync('python3', ['scripts/holiday_updater.py', 'apply', '--year', '2027', '--review', review, '--destination', destination, '--attest-reviewed'], { cwd: root, encoding: 'utf8' })
    }
    check({ original, apply, destination })
  } finally { rmSync(folder, { recursive: true, force: true }) }
}

test('actual Python apply produces accepted official data with reviewed bilingual naming variants', () => {
  withReview(({ original, apply, destination }) => {
    original.holidays[0].names = [{ en: 'Eid al-Fitr — synthetic naming variant', bn: 'ঈদ-উল-ফিতর — কৃত্রিম পরীক্ষার নাম' }]
    const result = apply(original)
    assert.equal(result.status, 0, result.stderr)
    const confirmed = JSON.parse(readFileSync(destination, 'utf8'))
    const record = confirmed['2027']
    assert.equal(validateConfirmedYear(record, 2027), true)
    assert.equal(record.completeAnnualList, true)
    assert.equal(record.reviewedBy, original.reviewedBy)
    assert.deepEqual(record.sources, original.sources)
    const built = buildHolidayData(confirmed)
    assert.equal(built.metadata[2027].status, 'official')
    assert.equal(built.metadata[2027].reviewedBy, original.reviewedBy)
    assert.deepEqual(built.metadata[2027].sources, original.sources)
    assert.deepEqual(built.holidays.filter(h => h.date.startsWith('2027-')).map(({ status, ...h }) => h), original.holidays)
    assert.equal(built.metadata[2028].status, 'projected')
  })
})

test('Python apply and frontend both fail closed for unreviewed, partial or malformed annual lists', () => {
  withReview(({ original, apply, destination }) => {
    assert.equal(apply(original).status, 0)
    const before = readFileSync(destination, 'utf8')
    const changes = [
      value => { delete value.completeAnnualList },
      value => { value.completeAnnualList = false },
      value => { value.reviewedBy = '  ' },
      value => { value.holidays = value.holidays.slice(0, 9) },
      value => { value.holidays = value.holidays.slice(0, 10).map((h, i) => ({ ...h, date: `2027-01-${String(i + 1).padStart(2, '0')}` })) },
      value => { value.holidays[0].names[0].bn = 'English only' },
      value => { value.holidays[0].status = 'projected' },
      value => { value.holidays.push(value.holidays[0]) },
      value => { value.holidays[0].date = '2027-02-30' },
      value => { value.workingDays = [value.holidays[0].date] },
      value => { value.verifiedOn = '2099-01-01' },
      value => { value.sources[0].url = 'https://mopa.gov.bd:444/fixture.pdf' },
      value => { value.sources[0].url = 'https://bssnews.net/synthetic-fixture' },
    ]
    for (const change of changes) {
      const candidate = structuredClone(original)
      change(candidate)
      assert.notEqual(apply(candidate).status, 0, change.toString())
      assert.equal(readFileSync(destination, 'utf8'), before, 'failed apply must preserve prior bytes')
      candidate.status = 'official'
      assert.equal(validateConfirmedYear(candidate, 2027), false, change.toString())
      assert.equal(buildHolidayData({ 2027: candidate }).metadata[2027].status, 'projected')
    }
  })
})
