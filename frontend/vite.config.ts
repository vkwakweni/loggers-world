/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // amazon-cognito-identity-js expects Node's `global` (via its Buffer
    // dependency); Vite doesn't polyfill Node globals like webpack does,
    // so alias it to the browser's globalThis.
    global: 'globalThis',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
