import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Dev-only proxy: the browser talks to a single origin (this dev server), Vite forwards
  // /api/** to the API gateway server-side. Without it every call would be cross-origin and
  // the gateway (which has no CORS filter at all) would block the X-User-Id preflight.
  // Same-origin also mirrors production, where the FE host routes /api to the gateway.
  // Target differs per machine (Traefik NodePort / tunnel host / local gateway) => env, not code.
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:30195'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
