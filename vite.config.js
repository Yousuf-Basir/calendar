import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'precache-app-assets',
      async writeBundle(options, bundle) {
        // Include hashed JS, CSS and local fonts in the install cache.
        const assets = Object.keys(bundle)
          .filter((file) => /\.(js|css|woff2)$/.test(file))
          .map((file) => `/${file}`)
        const workerPath = resolve(options.dir, 'sw.js')
        const worker = await readFile(workerPath, 'utf8')
        await writeFile(workerPath, worker.replace('/* build assets */ []', JSON.stringify(assets)))
      },
    },
  ],
})
