# Offline PWA template

A minimal React + Vite starter with offline storage and an installable app shell. This branch contains no calendar or todo application.

## Start a new project

```bash
git clone --branch pwa-offline --single-branch https://github.com/Yousuf-Basir/calendar.git my-pwa
cd my-pwa
npm install
npm run dev
```

Replace the starter content in `src/App.jsx` with your application.

## Included

- IndexedDB storage and local CRUD through `useOfflineData`.
- Persistent mutation queue, reconnection sync, and configurable conflict resolution.
- Always-visible online/offline indicator with pending sync status.
- Installation drawer with native browser prompts and platform-specific instructions.
- Standalone manifest, regular/maskable PNG icons, and Apple touch icon.
- Service worker with production precaching of scripts, styles, fonts, and icons.
- Local font assets, with no remote font dependency.

## Offline data

The original offline infrastructure is preserved in `src/db`, `src/hooks`, and `src/sync`. Import hooks from the local source files:

```jsx
import { useOfflineData } from './hooks/useOfflineData.js'

// Inside your own component:
const { records, loading, add, update, remove, reload } = useOfflineData('records')
// await add({ title: 'Example record' })
// await update({ id: recordId, title: 'Updated record' })
// await remove(recordId)
```

Writes save to IndexedDB immediately and enter the persistent sync queue. The starter screen creates no sample records. Configure your backend in `src/main.jsx` before using cloud sync; no backend is included. The default API base is `/api`.

The existing sync engine supports `newer-wins`, `client-wins`, `server-wins`, or a custom `(local, server) => record` conflict strategy. Its API contract is:

```text
GET    /api/{collection}/{id}   -> record or 404
POST   /api/{collection}        -> create record
PUT    /api/{collection}/{id}   -> replace record
DELETE /api/{collection}/{id}   -> delete record
```

## Customize and deploy

Update the name and copy in `src/App.jsx`, `src/components/InstallDrawer.jsx`, and `src/pwa/install.js`. Replace the icons in `public/icons` and update `index.html` and `public/manifest.webmanifest` for your app. Give your app unique IndexedDB, installation preference, and service worker cache names.

```bash
npm test
npm run build
npm run preview
```

Deploy the complete `dist/` directory at your domain root over HTTPS. See [PWA.md](PWA.md) for caching, installation, and offline verification. This is a source template, not the published `react-offline-kit` npm package.

## Attribution and license

Based on [react-offline-first](https://github.com/iamadhitya1/react-offline-first) by M. Adhitya. The upstream IndexedDB wrapper, hooks, and sync engine are retained. PWA installation and production asset precaching were added in this project.

[MIT license](LICENSE); original attribution is preserved.
