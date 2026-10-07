import { fileURLToPath, URL } from "url";
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fazendaProxy } from './server/fazendaProxy.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), fazendaProxy({ ...loadEnv(mode, process.cwd(), ""), ...process.env })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}))
