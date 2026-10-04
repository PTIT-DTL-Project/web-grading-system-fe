import { Button, Card, Spin, Typography } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'
import { getIdentity } from '../../shared/auth/identity'
import { redirectToKeycloakLogin } from '../../shared/auth/keycloak'
import { colors } from '../../shared/theme/tokens'

/**
 * Sign-in entry point. There is no password form here: the browser never sees
 * a credential — `redirectToKeycloakLogin()` navigates to Keycloak's own
 * hosted login page (authorization code + PKCE, D7/R3).
 *
 * An already authenticated session must never sit on this route: keycloak-js
 * returns the callback to `location.href` (here `/login`) and only strips the
 * query, so without the guard below this page re-fires `login()` after every
 * successful sign-in and the browser ping-pongs with Keycloak forever.
 *
 * While the automatic redirect is in flight this route renders a
 * spinner only. The card below is the fallback for a redirect that
 * could NOT start (`redirectToKeycloakLogin()` rejected — blocked
 * navigation / uninitialized adapter), where the button is the only
 * way out. Rendering the card as the default view made every reload
 * of a deep link (/classes/:id) flash the login card before the
 * browser was sent to Keycloak.
 * Review: 2026-10-04 (reload card flash);
 * 2026-10-03, Phase 3 (D7, D10 — forced-change branch removed);
 * 2026-10-03, infinite-redirect fix (authenticated guard).
 */
export function LoginPage() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  // StrictMode mounts effects twice in dev: without this guard the second run
  // would fire a second authorize redirect (and a second PKCE verifier).
  const loginStarted = useRef(false)

  const startLogin = useCallback(() => {
    setError(null)
    // login() navigates away and therefore never settles; a rejection is the
    // only signal we get when the redirect was blocked — show it and leave the
    // button below as the way out (it stays clickable in that case).
    void redirectToKeycloakLogin().catch((e: unknown) => {
      console.error('Keycloak login redirect failed:', e)
      setError(t('auth.networkError'))
    })
  }, [t])

  // The session already exists here (AuthGate settles keycloak.init() before
  // the router mounts, so this is a synchronous, reliable read).
  const authenticated = getIdentity() !== null

  useEffect(() => {
    // Guard INSIDE the effect too: returning <Navigate> below does not cancel
    // an effect scheduled by this same commit, so the redirect would fire once
    // before navigation anyway. Review: 2026-10-03, infinite-redirect fix.
    if (loginStarted.current || authenticated) return
    loginStarted.current = true
    startLogin()
  }, [startLogin, authenticated])

  // Already signed in → leave /login immediately (route `/` resolves the role
  // landing page). Without this the post-callback URL, which is still /login,
  // starts a new authorize round-trip against the live SSO session: an
  // endless /login ↔ Keycloak loop. Review: 2026-10-03, infinite-redirect fix.
  if (authenticated) return <Navigate to="/" replace />

  // The mount effect above has already fired (or fires immediately
  // after this paint) and the browser is on its way to Keycloak, so
  // show only a spinner. keycloak-js's login() always navigates
  // (window.location.assign) and its promise never settles — the only
  // non-navigating outcome is a rejection, which sets `error` and
  // falls through to the card below.
  // Review: 2026-10-04 (reload showed the card before the redirect)
  if (!error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.layoutBg,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <Card styles={{ body: { padding: 0 } }} style={{ width: 420, overflow: 'hidden' }}>
        <div
          style={{
            background: colors.primary,
            color: colors.textOnPrimary,
            padding: '26px 32px',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{t('app.name')}</div>
          <div style={{ fontSize: 13, opacity: 0.92 }}>{t('app.tagline')}</div>
        </div>

        <div style={{ padding: '26px 32px 32px' }}>
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            {t('auth.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            {t('auth.subtitle')}
          </Typography.Paragraph>

          {error && (
            <div style={{ color: colors.error, marginBottom: 12, fontSize: 13 }} role="alert">
              {error}
            </div>
          )}

          {/* Fallback if the automatic redirect above did not fire or was blocked. */}
          <Button type="primary" block size="large" onClick={startLogin}>
            {t('auth.login')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
