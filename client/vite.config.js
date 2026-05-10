import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"
import basicSsl from '@vitejs/plugin-basic-ssl'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(),basicSsl()],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  worker: {
    format: 'es',
  },

  build: {
    outDir: 'dist',       // Capacitor reads this
    emptyOutDir: true,
  },

  server: {
    // COOP/COEP only in dev — Capacitor WebView doesn't need them
    // and they break native WebView context
    https:true,
    headers: command === 'serve' ? {
      'Cross-Origin-Opener-Policy':   'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    } : {},
  },
}))