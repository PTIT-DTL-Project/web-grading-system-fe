import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Dev-only proxy: the browser talks to a single origin (this dev server), Vite forwards
  // /api/** to the API gateway server-side. Without it every call would be cross-origin and
  // the gateway (which has no CORS filter at all) would reject the Authorization preflight.
  // Same-origin also mirrors production, where the FE host routes /api to the gateway.
  // Target differs per machine (Traefik NodePort / tunnel host / local gateway) => env, not code.
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:30195'

  // Preconnect the browser to the Keycloak origin: auth round trips (3p-cookies
  // probe / silent-check iframe / token exchange) run on every reload, so DNS +
  // TLS (~150–250 ms per load through the tunnel, measured 2026-10-04) should
  // overlap the bundle parse instead of delaying the first auth request.
  // Derived from VITE_KEYCLOAK_AUTHORITY here rather than written as a literal
  // `%VITE_*%` placeholder in index.html: an unset var would leave the
  // placeholder text in the served HTML.
  // Review: 2026-10-04 (reload latency)
  let keycloakOrigin: string | null = null
  if (env.VITE_KEYCLOAK_AUTHORITY) {
    try {
      keycloakOrigin = new URL(env.VITE_KEYCLOAK_AUTHORITY).origin
    } catch {
      keycloakOrigin = null
    }
  }

  return {
    plugins: [
      react(),
      {
        name: 'preconnect-keycloak',
        transformIndexHtml(html) {
          if (!keycloakOrigin) return html
          // Both sockets: the authorize navigation / silent iframe is a plain
          // request, the token POST (fetch, CORS) needs its own connection.
          return html.replace(
            '</head>',
            `    <link rel="preconnect" href="${keycloakOrigin}" />\n` +
              `    <link rel="preconnect" href="${keycloakOrigin}" crossorigin />\n` +
              `  </head>`,
          )
        },
      },
    ],
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
