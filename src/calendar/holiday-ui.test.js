import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { isoToDay } from './calendar.js'

test('holiday UI localizes projected warnings, preserves official/missing notices and English-only visibility', async () => {
  assert.ok(existsSync(new URL('../components/HolidayList.jsx', import.meta.url)), 'testable holiday list exists')
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: HolidayList } = await server.ssrLoadModule('/src/components/HolidayList.jsx')
    const { dateLabel } = await server.ssrLoadModule('/src/components/Calendar.jsx')
    assert.equal(typeof dateLabel, 'function')
    assert.match(dateLabel(isoToDay('2027-02-21'), 'en', 'en'), /Projected · unconfirmed/)
    assert.match(dateLabel(isoToDay('2027-02-21'), 'en', 'bn'), /সম্ভাব্য · অনিশ্চিত/)
    assert.doesNotMatch(dateLabel(isoToDay('2026-02-21'), 'en', 'en'), /Projected|unconfirmed/)
    assert.doesNotMatch(dateLabel(isoToDay('2027-02-21'), 'bn', 'bn'), /সম্ভাব্য|অনিশ্চিত/)
    const render = (date, appLanguage = 'en', language = 'en') => renderToStaticMarkup(createElement(HolidayList, { viewedDate: isoToDay(date), appLanguage, language }))
    const empty = render('2027-01-08')
    assert.match(empty, /role="status"/)
    assert.match(empty, /Projected holidays for 2027/)
    assert.match(empty, /not confirmed by the government/)
    assert.match(empty, />Projected holidays for 2027 — not confirmed by the government<\/p>/)
    assert.doesNotMatch(empty, /Lunar dates|Only Eid core days/)
    assert.doesNotMatch(empty, /Official holiday dates not loaded/)
    const future = render('2036-12-08')
    assert.match(future, /Official holiday dates not loaded for 2036/)
    assert.doesNotMatch(future, /Projected holidays for|Projected · unconfirmed/)
    const bangla = render('2027-02-08', 'bn')
    assert.match(bangla, /২০২৭/)
    assert.match(bangla, />সম্ভাব্য ছুটির বছর: ২০২৭ — সরকারিভাবে নিশ্চিত নয়।<\/p>/)
    assert.doesNotMatch(bangla, /চাঁদ দেখার|ঈদের মূল দিন/)
    assert.match(bangla, /সম্ভাব্য · অনিশ্চিত/)
    const official = render('2026-10-08')
    assert.doesNotMatch(official, /Projected|unconfirmed|role="status"/)
    assert.match(official, /Government working day/)
    const missing = render('2037-02-08')
    assert.match(missing, /Official holiday dates not loaded for 2037/)
    assert.doesNotMatch(missing, /Projected holidays/)
    assert.equal(render('2027-02-08', 'bn', 'bn'), '')
  } finally { await server.close() }
})
