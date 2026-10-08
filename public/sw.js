/**
 * Service Worker — caches the app shell for full offline support.
 * Serves cached assets when offline, fetches fresh when online.
 */

const CACHE_NAME = 'calendar-shell-v6'
// Vite fills this list for production. Dev assets are cached as requested.
const BUILD_ASSETS = /* build assets */ []
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webmanifest',
  '/icons/calendar-custom-32.png', '/icons/calendar-custom-180.png',
  '/icons/calendar-custom-192.png', '/icons/calendar-custom-512.png', '/icons/calendar-custom-maskable-512.png',
  ...BUILD_ASSETS]

// Install — cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('calendar-shell-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Don't intercept API calls
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache fresh responses
        if (response.ok && (event.request.mode === 'navigate' || !response.headers.get('content-type')?.includes('text/html'))) {
          const clone = response.clone()
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match('/index.html')
        return Response.error()
      })
  )
})
