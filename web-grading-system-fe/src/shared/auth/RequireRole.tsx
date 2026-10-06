import { Navigate } from 'react-router'
import { useEffect } from 'react'
import type { JSX, ReactNode } from 'react'
import { getIdentity } from './identity'
import type { Role } from './keycloak'

/**
 * Role gate for routes that must not leak across personas
 * (a student typing `/classes` would otherwise land on the lecturer screen).
 *
 * - No identity  → /login
 * - Logged in but wrong role  → /no-role (avoids a guard redirect loop)
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }): JSX.Element {
  const identity = getIdentity()

  // Review: 2026-10-05, Pullfrog — capture the deep link in the redirect commit, not as a render side effect.
  useEffect(() => {
    if (!identity) {
      sessionStorage.setItem('wgs.postLoginUrl', window.location.href)
    }
  }, [identity])

  if (!identity) {
    return <Navigate to="/login" replace />
  }
  if (identity.role !== role) return <Navigate to="/no-role" replace />
  return <>{children}</>
}
