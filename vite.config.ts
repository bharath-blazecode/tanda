import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // `npm run dev` starts the API on 3333; the browser only ever talks to Vite.
    proxy: { '/api': 'http://localhost:3333' },
    // Lets a cloudflared quick tunnel reach the dev server, for testing on a real phone.
    allowedHosts: ['.trycloudflare.com'],
  },
  build: { outDir: 'dist' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'shared/**/*.test.ts'],
  },
})
