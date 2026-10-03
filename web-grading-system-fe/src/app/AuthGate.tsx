import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router'
import { initAuth } from '../shared/auth/keycloak'
import { ErrorState } from '../shared/ui/ErrorState'
import { router } from './router'

type InitState = 'initializing' | 'ready' | 'failed'

// keycloak-js puts no timeout on the silent check-sso iframe round-trip, so a
// missing/blocked silent-check-sso.html would otherwise spin forever. This is
// deliberately longer than keycloak-js's own 10s third-party-cookie probe.
const INIT_TIMEOUT_MS = 20_000

/**
 * Bootstrap gate for `keycloak.init()` (Phase 3, plan §2.8).
 *
 * `init()` is async while `RequireIdentity`/`RequireRole`/`AppLayout` read
 * `getIdentity()`/`getSession()` synchronously at render — mounting the router
 * first would make every page reload look logged-out and bounce to /login.
 * So: await init, show a spinner while it runs, an error + Retry if it fails,
 * and only then mount the router (route guards finally see a real session).
 *
 * Review: 2026-10-03, Phase 3 (D8)
 */
export function AuthGate() {
  const { t } = useTranslation()
  const [state, setState] = useState<InitState>('initializing')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let alive = true
    const watchdog = window.setTimeout(() => {
      if (alive) {
        setError(new Error('init_timeout'))
        setState('failed')
      }
    }, INIT_TIMEOUT_MS)

    initAuth()
      .then(() => {
        window.clearTimeout(watchdog)
        if (alive) setState('ready')
      })
      .catch((e: unknown) => {
        window.clearTimeout(watchdog)
        console.error('Keycloak init failed:', e)
        if (alive) {
          setError(e)
          setState('failed')
        }
      })

    // StrictMode runs this effect twice in dev: only the second run's promise
    // callbacks may update state, and the first watchdog must not fire later.
    return () => {
      alive = false
      window.clearTimeout(watchdog)
    }
  }, [])

  if (state === 'initializing') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (state === 'failed') {
    // A token without LECTURER/STUDENT is an account problem, not a transport
    // one — say so instead of blaming the auth server.
    const message =
      error instanceof Error && error.message === 'token_no_allowed_role'
        ? t('auth.noRole')
        : t('auth.initFailed')
    // Retry = full reload: a half-initialized adapter instance must not be reused.
    return <ErrorState message={message} onRetry={() => window.location.reload()} />
  }

  return <RouterProvider router={router} />
}
