# Calendar design foundation

The supplied mobile reference defines the home screen's design. Calendar grids and navigation now follow that design; event features remain deferred. The todo demo is removed; the reusable IndexedDB and sync modules remain, and existing stored records are retained. See `CALENDAR.md` for calendar conventions and holiday sources.

The reference uses a warm gray surface, orange oversized date, near-black bold month, muted brown year and weekday, and generous empty space. The app follows its light theme with native CSS; reusable tokens live in `src/index.css`.

| Token | Value |
| --- | --- |
| Outer backdrop | `#e6ddcf` |
| App surface | `#dedbd5` |
| Primary text | `#1d1e1b` |
| Secondary text | `#776650` |
| Orange accent | `#fa633b` |
| Border | `#c9c5bc` |
| Soft surface | `#d2cfc6` |
| App maximum width | `480px` |

DM Sans is a close visual match, not an identification of the font in the photo. Its variable Latin WOFF2 file is bundled in `src/assets/fonts`, with its SIL Open Font License alongside it. The source was Google Fonts (`https://fonts.google.com/specimen/DM+Sans`). There are no runtime requests to Google Fonts or other external resources.

Production builds inject the hashed JavaScript, CSS, and font paths into the service worker's install cache. Offline use requires one successful online visit and service worker installation. Verify offline behavior using `npm run build` and `npm run preview`; Vite development modules are cached only as requested.

The home screen focuses on the calendar, with an enlarged orange month heading, abbreviated weekday headings, and static date cells. Today uses Bangladesh time and refreshes when resumed or left open overnight. Online status reflects the browser's network status, rather than the availability of the configured API. Sync status and manual synchronization are still available when mutations are queued.

Validation: production build passed; layouts fit 320px and 390px viewports and remain 480px wide at a 1280px viewport. Chrome reloaded the production app with the preview server stopped, including the bundled font and stylesheet.

The install promotion uses a native bottom dialog, a compact reminder pill, and a local minimal calendar icon. See [PWA.md](PWA.md) for platform behavior and release checks.
