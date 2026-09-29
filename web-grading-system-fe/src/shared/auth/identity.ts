export type Role = 'LECTURER' | 'STUDENT'

export interface Identity {
  role: Role
  userId: string
}

const STORAGE_KEY = 'wgs.identity'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

/**
 * The ONLY place in the app that knows where the identity lives.
 * Every request reads it (shared/api/http.ts). When Keycloak lands, this module is the
 * swap seam: replace the localStorage read with a JWT claim and drop the header injection.
 */
export function getIdentity(): Identity | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Identity>
    if (!parsed.userId || (parsed.role !== 'LECTURER' && parsed.role !== 'STUDENT')) return null
    if (!isValidUuid(parsed.userId)) return null
    return { role: parsed.role, userId: parsed.userId.trim().toLowerCase() }
  } catch {
    return null
  }
}

export function setIdentity(identity: Identity): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ role: identity.role, userId: identity.userId.trim().toLowerCase() }),
  )
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY)
}
