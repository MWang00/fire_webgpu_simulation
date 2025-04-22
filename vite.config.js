// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'docs',
    rollupOptions: {
      input: {
        page1: resolve(__dirname, 'apps/lavalamp/index.html'),
        page2: resolve(__dirname, 'apps/flamewall/index.html'),
      }
    }
  },
  server: {
    open: '/apps/lavalamp/index.html'
  }
})
