# Contributing

Use the `pwa-offline` branch for this template. Run `npm install`, then `npm run dev`.

Keep application-specific features out of this branch. Preserve the offline hooks, IndexedDB wrapper, sync engine, installation drawer, and connection indicator. Avoid new runtime dependencies unless needed.

Run `npm test` and `npm run build` before submitting changes. Verify the production preview loads after going offline and check the installation drawer at mobile widths. Target template pull requests at `pwa-offline`.

Based on M. Adhitya's MIT-licensed react-offline-first project; see LICENSE.
