import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Disable HMR when running behind reverse proxy (nginx gateway)
    // Client-side changes will require manual refresh, but no WebSocket errors
    hmr: false,
  },
})
