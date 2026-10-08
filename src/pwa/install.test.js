import { runInNewContext } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { createInstallController, INSTALL_STORAGE_KEY, installInstructions } from './install.js'

function browser({ storage = new Map(), standalone = false, navigator = {} } = {}) {
  const events = new Map()
  const queries = new Map()
  return {
    navigator: { userAgent: 'Chrome', ...navigator },
    location: { href: 'https://calendar.example/' },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    matchMedia(query) {
      if (!queries.has(query)) queries.set(query, {
        matches: standalone && query === '(display-mode: standalone)',
        addEventListener() {}, removeEventListener() {},
      })
      return queries.get(query)
    },
    addEventListener(type, listener) { events.set(type, listener) },
    removeEventListener(type) { events.delete(type) },
    emit(type, value = {}) { events.get(type)?.(value) },
  }
}

test('Cancel suppresses one visit and opens again on the second subsequent visit', async () => {
  const storage = new Map()
  let controller = createInstallController(browser({ storage }))
  await controller.ready
  assert.equal(controller.getSnapshot().open, true)
  controller.cancel()
  assert.equal(controller.getSnapshot().open, false)
  controller.destroy()
  controller = createInstallController(browser({ storage }))
  await controller.ready
  assert.equal(controller.getSnapshot().open, false)
  controller.open()
  assert.equal(controller.getSnapshot().open, true, 'manual button bypasses automatic cooldown')
  controller.destroy()
  controller = createInstallController(browser({ storage }))
  await controller.ready
  assert.equal(controller.getSnapshot().open, true)
})

test('native install prompt is called once; appinstalled persists suppression', async () => {
  const storage = new Map()
  const environment = browser({ storage })
  const controller = createInstallController(environment)
  await controller.ready
  let prevented = false
  let prompted = 0
  environment.emit('beforeinstallprompt', {
    preventDefault() { prevented = true },
    prompt() { prompted++; return Promise.resolve() },
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  })
  assert.equal(prevented, true)
  await Promise.all([controller.install(), controller.install()])
  assert.equal(prompted, 1)
  assert.equal(controller.getSnapshot().open, false)
  assert.equal(controller.getSnapshot().installed, false, 'acceptance alone is not completion')
  environment.emit('appinstalled')
  assert.equal(controller.getSnapshot().installed, true)
  const revisit = createInstallController(browser({ storage }))
  await revisit.ready
  assert.equal(revisit.getSnapshot().installed, true)
  assert.equal(revisit.getSnapshot().open, false)
})

test('native dismissal uses cooldown and unavailable prompts show instructions', async () => {
  const environment = browser()
  const controller = createInstallController(environment)
  await controller.ready
  await controller.install()
  assert.equal(controller.getSnapshot().instructions, true)
  environment.emit('beforeinstallprompt', {
    preventDefault() {}, prompt: async () => {},
    userChoice: Promise.resolve({ outcome: 'dismissed' }),
  })
  await controller.install()
  assert.equal(controller.getSnapshot().open, false)
  assert.equal(JSON.parse(environment.localStorage.getItem(INSTALL_STORAGE_KEY)).visitsUntilPrompt, 2)
})

test('standalone and iOS installed launches never display install controls', async () => {
  for (const options of [{ standalone: true }, { navigator: { standalone: true } }]) {
    const controller = createInstallController(browser(options))
    await controller.ready
    controller.open()
    assert.equal(controller.getSnapshot().installed, true)
    assert.equal(controller.getSnapshot().open, false)
  }
})

test('related-app detection identifies only this calendar manifest', async () => {
  for (const [url, installed] of [['/manifest.webmanifest', true], ['/another.webmanifest', false]]) {
    const controller = createInstallController(browser({ navigator: {
      getInstalledRelatedApps: async () => [{ platform: 'webapp', url }],
    } }))
    await controller.ready
    assert.equal(controller.getSnapshot().installed, installed)
    assert.equal(controller.getSnapshot().open, !installed)
  }
})

test('new native offer recovers a saved installed flag after uninstall', async () => {
  const storage = new Map([[INSTALL_STORAGE_KEY, JSON.stringify({ installed: true })]])
  const environment = browser({ storage })
  const controller = createInstallController(environment)
  await controller.ready
  environment.emit('beforeinstallprompt', { preventDefault() {}, prompt: async () => {} })
  assert.equal(controller.getSnapshot().installed, false)
  assert.equal(controller.getSnapshot().canPrompt, true)
})

test('restricted storage and failed detection do not break the calendar', async () => {
  const environment = browser({ navigator: { getInstalledRelatedApps: async () => { throw Error('unsupported') } } })
  environment.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  const controller = createInstallController(environment)
  await controller.ready
  assert.equal(controller.getSnapshot().open, true)
  controller.cancel()
  assert.equal(controller.getSnapshot().open, false)
})

test('platform instructions cover iPhone, desktop-mode iPad, Android and Safari', () => {
  for (const navigator of [{ userAgent: 'iPhone' }, { platform: 'MacIntel', maxTouchPoints: 5 }]) {
    assert.match(installInstructions(browser({ navigator })).join(' '), /Add to Home Screen/)
  }
  assert.match(installInstructions(browser({ navigator: { userAgent: 'Android Firefox' } })).join(' '), /Install app/)
  assert.match(installInstructions(browser({ navigator: { userAgent: 'Macintosh Safari' } })).join(' '), /Add to Dock/)
})

test('manifest and all local install icons exist with correct PNG dimensions', async () => {
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'))
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.id, '/')
  assert.equal(manifest.scope, '/')
  assert.ok(manifest.start_url.startsWith('/'))
  for (const icon of manifest.icons) {
    const png = await readFile(`public${icon.src}`)
    const size = Number(icon.sizes.split('x')[0])
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
  }
  await access('public/icons/calendar-image-180.png')
  const html = await readFile('index.html', 'utf8')
  assert.match(html, /rel="manifest"/)
  assert.match(html, /rel="apple-touch-icon"/)
})


test('service worker precache URLs are unique and all local static files exist', async () => {
  const worker = await readFile('public/sw.js', 'utf8')
  const urls = runInNewContext(`${worker}\nSTATIC_ASSETS`, { self: { addEventListener() {} } })
  assert.equal(new Set(urls).size, urls.length, 'duplicate requests make cache.addAll fail')
  for (const url of urls) await access(url === '/' || url === '/index.html' ? 'index.html' : `public${url}`)
})
