import { Navigate } from 'react-router'
import type { JSX, ReactNode } from 'react'
import { getIdentity } from './identity'
import type { Role } from './keycloak'

/**
 * Role gate for routes that must not leak across personas
 * (a student typing `/classes` would otherwise land on the lecturer screen).
 *
 * - No identity  → /login
 * - Logged in but wrong role  → /no-role (avoids the RequireRole ↔ HomeRedirect loop)
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }): JSX.Element {
  const identity = getIdentity()
  if (!identity) return <Navigate to="/login" replace />
  if (identity.role !== role) return <Navigate to="/no-role" replace />
  return <>{children}</>
}
