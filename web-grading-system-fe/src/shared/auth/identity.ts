/** Swap seam for identity — now derived from the Keycloak JWT session. */

import { getSession, clearSession, type Role } from './keycloak'

export interface Identity {
  role: Role
  userId: string
  email?: string
}

/** The only place the app reads the current identity from. */
export function getIdentity(): Identity | null {
  const session = getSession()
  if (!session) return null
  return { role: session.role, userId: session.userId, email: session.email }
}

export function clearIdentity(): void {
  clearSession()
}
