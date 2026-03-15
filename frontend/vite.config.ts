import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Disable HMR only when running behind reverse proxy (nginx in Docker)
    // Set VITE_DISABLE_HMR=true in .env to disable WebSocket HMR
    hmr: process.env.VITE_DISABLE_HMR === 'true' ? false : undefined,
  },
})
