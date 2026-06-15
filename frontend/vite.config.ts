import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Disable HMR only when running behind reverse proxy (nginx in Docker)
      // Set VITE_DISABLE_HMR=true in .env to disable WebSocket HMR
      hmr: env.VITE_DISABLE_HMR === 'true' ? false : undefined,
      // Allow any host header. Needed when served behind a platform proxy
      // (Railway/Vercel) whose generated domain isn't known at build time.
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
  }
})
