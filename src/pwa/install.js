export const INSTALL_STORAGE_KEY = 'calendar-install-v1'

function readRecord(environment) {
  try {
    const value = JSON.parse(environment.localStorage.getItem(INSTALL_STORAGE_KEY) || '{}')
    return {
      installed: value?.installed === true,
      visitsUntilPrompt: Number.isInteger(value?.visitsUntilPrompt)
        ? Math.max(0, Math.min(2, value.visitsUntilPrompt)) : 0,
    }
  } catch {
    return { installed: false, visitsUntilPrompt: 0 }
  }
}

export function isStandalone(environment) {
  return environment.navigator.standalone === true ||
    ['standalone', 'minimal-ui', 'window-controls-overlay'].some((mode) =>
      environment.matchMedia(`(display-mode: ${mode})`).matches)
}

export function installInstructions(environment) {
  const { userAgent = '', platform = '', maxTouchPoints = 0 } = environment.navigator
  const appleMobile = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  if (appleMobile) return [
    'Open the browser’s Share menu.',
    'Choose “Add to Home Screen”. You may need to tap “More” first.',
    'Keep “Open as Web App” on if shown, then tap “Add”.',
    'If this option is missing, open this page in Safari and try again.',
  ]
  if (/Macintosh/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|Chromium|Edg/.test(userAgent)) {
    return ['Open this page in Safari.', 'Choose File → Add to Dock, then choose “Add”.']
  }
  if (/Android/.test(userAgent)) return [
    'Open the browser’s menu.',
    'Choose “Install app” or “Add to Home screen”, then confirm.',
    'If this option is missing, open this page in Chrome or Samsung Internet.',
  ]
  return [
    'Look for an install button beside the address bar or in the browser’s menu.',
    'Choose “Install Calendar” or “Install this site as an app”, then confirm.',
    'If this option is missing, open this page in Chrome or Edge.',
  ]
}

// One controller per document, outside React effects: StrictMode and calendar
// switches must not count as new visits or lose an early browser install event.
export function createInstallController(environment) {
  let record = readRecord(environment)
  let deferredPrompt = null
  const listeners = new Set()
  const writeRecord = () => {
    try { environment.localStorage.setItem(INSTALL_STORAGE_KEY, JSON.stringify(record)) } catch { /* private browsing */ }
  }
  const displayedAsApp = isStandalone(environment)
  if (displayedAsApp) { record.installed = true; writeRecord() }
  const autoOpen = record.visitsUntilPrompt === 0 || record.visitsUntilPrompt === 1
  if (record.visitsUntilPrompt > 0) { record.visitsUntilPrompt--; writeRecord() }
  let state = {
    installed: record.installed, ready: false, open: false,
    canPrompt: false, busy: false, instructions: false, message: '',
  }
  const update = (patch) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }
  const markInstalled = () => {
    record = { installed: true, visitsUntilPrompt: 0 }
    writeRecord()
    deferredPrompt = null
    update({ installed: true, open: false, busy: false, canPrompt: false, instructions: false })
  }
  const cancel = () => {
    record.visitsUntilPrompt = 2
    writeRecord()
    update({ open: false, busy: false, instructions: false, message: '' })
  }
  const beforePrompt = (event) => {
    event.preventDefault()
    if (isStandalone(environment)) { markInstalled(); return }
    deferredPrompt = event
    // A new install offer is evidence of an uninstall or a stale stored flag.
    record.installed = false
    writeRecord()
    update({ installed: false, canPrompt: true })
  }
  const modeQueries = ['standalone', 'minimal-ui', 'window-controls-overlay'].map((mode) =>
    environment.matchMedia(`(display-mode: ${mode})`))
  const checkMode = () => { if (isStandalone(environment)) markInstalled() }
  const storageChanged = (event) => {
    if (event.key === INSTALL_STORAGE_KEY && readRecord(environment).installed) markInstalled()
  }
  environment.addEventListener('beforeinstallprompt', beforePrompt)
  environment.addEventListener('appinstalled', markInstalled)
  environment.addEventListener('storage', storageChanged)
  modeQueries.forEach((query) => query.addEventListener?.('change', checkMode))

  // Browsers that can inspect same-origin installations may suppress the offer
  // even when the user returns in a normal tab before opening the installed app.
  const ready = (async () => {
    if (!state.installed && environment.navigator.getInstalledRelatedApps) {
      try {
        const inspection = Promise.resolve(environment.navigator.getInstalledRelatedApps()).then((apps) => {
          const manifestUrl = new URL('/manifest.webmanifest', environment.location.href).href
          if (apps.some((app) => app.platform === 'webapp' && app.url &&
            new URL(app.url, environment.location.href).href === manifestUrl)) markInstalled()
        }).catch(() => {})
        let timeout
        await Promise.race([inspection, new Promise((resolve) => { timeout = setTimeout(resolve, 1500) })])
        clearTimeout(timeout)
      } catch { /* Installation detection is optional. */ }
    }
    update({ ready: true, open: !state.installed && autoOpen })
  })()

  return {
    ready,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => state,
    open() {
      if (!state.installed) update({ open: true, instructions: false, message: '' })
    },
    cancel,
    async install() {
      if (state.installed || state.busy) return
      if (!deferredPrompt) { update({ instructions: true, message: '' }); return }
      const prompt = deferredPrompt
      deferredPrompt = null
      update({ busy: true, canPrompt: false, message: '' })
      try {
        // Called directly from the button click, before the first await, so the
        // browser retains the user activation required for the native prompt.
        await prompt.prompt()
        const choice = await prompt.userChoice
        if (state.installed) return
        if (choice.outcome === 'accepted') {
          // Acceptance is not installation confirmation. appinstalled or an
          // installed launch commits the persistent installed flag.
          update({ busy: false, open: false })
        } else cancel()
      } catch {
        if (!state.installed) update({ busy: false, instructions: true,
          message: 'Use your browser’s menu to add Calendar instead.' })
      }
    },
    destroy() {
      environment.removeEventListener('beforeinstallprompt', beforePrompt)
      environment.removeEventListener('appinstalled', markInstalled)
      environment.removeEventListener('storage', storageChanged)
      modeQueries.forEach((query) => query.removeEventListener?.('change', checkMode))
      listeners.clear()
    },
  }
}
