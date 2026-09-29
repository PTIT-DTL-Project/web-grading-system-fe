import { Navigate } from 'react-router'
// React 19 types dropped the global JSX namespace — it lives under React.JSX.
import type { JSX, ReactNode } from 'react'
import { getIdentity } from './identity'
import type { Role } from './identity'

/**
 * Role gate for the routes that must not leak across personas (a student typing
 * `/classes` would otherwise land on the lecturer screen and meet a bare 404).
 * Wrong or missing identity → back to `/` where HomeRedirect picks the right landing.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }): JSX.Element {
  const identity = getIdentity()
  if (!identity || identity.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}
