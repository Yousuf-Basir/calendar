# Calendar installation and offline behavior

The app ships a local web app manifest, regular and maskable PNG icons, an Apple touch icon, standalone launch metadata, and a service worker that caches the shell, manifest, icons, scripts, styles and fonts. No PWA or UI package was added. The current launcher artwork is an AI-generated raster image, retained in `design/calendar-icon-original.png`; optimized PNG variants in `public/icons/calendar-image-*.png` are derived from it. The earlier SVG is retained as a historical asset.

## Install promotion

The bottom drawer opens on the first visit. Cancel (including Escape or tapping the backdrop) saves a two-visit counter: the first subsequent page load keeps it closed, and the second opens it again. Calendar switches and React StrictMode do not count as visits. A small bottom button can always reopen it while uninstalled. Preferences use localStorage, with a safe in-memory fallback if storage is blocked.

Install invokes the retained `beforeinstallprompt` event directly from a user click when available. A native rejection uses the same cooldown. Each native prompt is used once. Acceptance closes the drawer; `appinstalled` confirms installation and stores the installed flag. An installed standalone launch, including iOS's `navigator.standalone`, also saves that flag. Cross-tab storage notifications and display-mode changes hide both the drawer and bottom button.

Browsers supporting `getInstalledRelatedApps()` can identify this app through its self-related manifest entry. Detection has a bounded wait so the calendar does not depend on that API responding promptly. A later installable event clears a stale saved installed flag after uninstall.

## Browser behavior

- Chrome, Edge and compatible Android browsers: native Install prompt when the browser emits `beforeinstallprompt`; otherwise browser-menu instructions. Eligibility and timing belong to the browser.
- iPhone/iPad: Share → Add to Home Screen instructions, including the Open as Web App switch when present. If a browser does not expose that action, instructions direct the user to Safari. No website can trigger Apple's Add to Home Screen sheet itself.
- Firefox Android: browser-menu installation instructions when no native event is available.
- Safari on macOS: File → Add to Dock instructions.
- Desktop browsers without installation support: instructions direct users to Chrome or Edge; the calendar itself still works normally.

Installation is browser-controlled; one-click installation and reliable installed detection are not universal APIs. Installed app windows never show the promotion. Regular browser tabs also suppress it after a confirmed installation stored on the same origin, or a supported related-app check. Some platforms isolate the installed app's storage from the browser's storage, or lack detection APIs. A manually installed app that has never been opened may therefore still be offered in a regular tab. Clearing site data also clears remembered installation and cancellation. These restrictions cannot be fixed with a manifest or user-agent detection. See [MDN's standalone guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app) and [Chrome's installed-related-apps guide](https://developer.chrome.com/docs/capabilities/get-installed-related-apps).

## Release and validation

Serve the full `dist/` directory over HTTPS from the domain root. Localhost/127.0.0.1 are valid development contexts; a phone accessing a plain HTTP LAN address is not a production install test. Paths currently assume `/`, including the stable app ID. If deploying in a subdirectory, update the manifest, icon links, worker scope and paths, and Vite base together. Revalidate `sw.js` and `index.html` on hosting/CDN; hashed assets can be cached for longer.

Run `npm test` and `npm run build`, then `npm run preview -- --host 127.0.0.1`. Tests cover the visit counter, native acceptance/rejection, installed launches, saved status, related-app checks, storage failures, platform instructions, and actual icon dimensions. Test installation on real Android and iOS devices after deploying HTTPS; an emulated viewport cannot validate OS installation. Check the installed launch, hide promotion, close/reopen the app, and reload after disconnecting. Check manual browser-menu installation too. After Cancel, verify the next load stays closed and the following load opens the drawer, with manual reopening still available.

The service worker cache version is `calendar-shell-v4`. Vite injects hashed build assets into `dist/sw.js`. New releases should advance the cache version; installed users need an online visit and reload to receive new code or holiday data. Existing calendar conversion rules and holiday coverage are described in `CALENDAR.md` and `HOLIDAY_UPDATES.md`.

Verification for this change: 20 automated tests and the production build passed. Chrome reloaded the production app and install icon with the preview server stopped. The drawer, manual instructions, reminder button, and Cancel/revisit behavior were exercised in browser previews, including a 320px viewport. Native OS installation completion on physical Android/iOS devices remains a deployment check.
