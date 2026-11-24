import { brotliCompressSync } from 'node:zlib'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), {
    name: 'precompress-entry-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (!/\.(js|css)$/.test(file.fileName)) continue
        const content = file.type === 'chunk' ? file.code : file.source
        this.emitFile({ type: 'asset', fileName: file.fileName + '.br', source: brotliCompressSync(content) })
      }
    },
  }],
  server: {
    host: true,
    // `npm run dev` starts the API on 3333; the browser only ever talks to Vite.
    proxy: { '/api': 'http://localhost:3333' },
    // Lets a cloudflared quick tunnel reach the dev server, for testing on a real phone.
    allowedHosts: ['.trycloudflare.com'],
  },
  build: { outDir: 'dist', license: { fileName: 'CLIENT-LICENSES.json' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'shared/**/*.test.ts'],
  },
})
