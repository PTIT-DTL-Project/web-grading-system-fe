/**
 * Keycloak session module — keycloak-js, authorization code + PKCE (Phase 3).
 *
 * - Login is a full-page redirect to Keycloak's own hosted login page
 *   (`keycloak.login()`): the browser never collects or sends the user's
 *   password, so XSS cannot read it (closes R3 — the ROPC
 *   `grant_type=password` path is gone).
 * - Tokens live ONLY in memory inside the keycloak-js instance — nothing is
 *   written to localStorage, so XSS cannot steal a long-lived session
 *   (closes R4 — the persisted session key is gone).
 * - `initAuth()` is async, so it MUST settle before any route guard renders:
 *   `AuthGate` (src/app/AuthGate.tsx) awaits it and only then mounts the
 *   router, because `RequireIdentity`/`RequireRole` read `getSession()`
 *   synchronously at render time.
 * - Refresh is `keycloak.updateToken(30)`, deduped in-tab via `refreshPromise`.
 *   The Phase 2 Web Lock (REFRESH_LOCK) is kept as cross-tab serialization only
 *   (D9): since tokens are memory-only each tab holds its OWN refresh token, so
 *   there is no shared token to dedupe and no cross-tab "already fresh" state.
 * - Password changes still go through the API gateway
 *   (`/api/v1/account/change-password`), not Keycloak Admin, so no admin
 *   credentials live in the browser bundle.
 *
 * Review: 2026-10-03, Phase 3 (D7–D12).
 */
import Keycloak, { type KeycloakInitOptions } from 'keycloak-js'

const AUTHORITY = import.meta.env.VITE_KEYCLOAK_AUTHORITY ?? ''
const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'web-grading-fe'

export type Role = 'LECTURER' | 'STUDENT'

/**
 * Keycloak answered the refresh with a dead grant (400 — tokens dropped): the
 * session is gone and the caller (http.ts) may sign the user out.
 */
const REFRESH_DEAD = 'refresh_failed'
/**
 * The token endpoint could not be reached (network/5xx): the current session is
 * untouched and must be preserved — surfacing the error beats a spurious logout.
 * Exported because http.ts branches on it: only this error keeps the session.
 */
export const REFRESH_UNREACHABLE = 'refresh_unreachable'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  role: Role
}

// ---------------------------------------------------------------------------
// In-memory state only (D8). These replace the old persisted localStorage
// session: nothing here survives a reload — initAuth() rebuilds it via check-sso.
// ---------------------------------------------------------------------------
let keycloak: Keycloak | null = null
let session: AuthSession | null = null
let initPromise: Promise<void> | null = null
let refreshPromise: Promise<AuthSession> | null = null

function base64UrlDecode(input: string): string {
  const s = input.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(
    atob(s)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  )
}

function decodeJwt(payload: string): Record<string, unknown> {
  return JSON.parse(base64UrlDecode(payload))
}

function sessionFromTokens(tokens: {
  access_token: string
  refresh_token: string
}): AuthSession {
  const claims = decodeJwt(tokens.access_token.split('.')[1])
  const realmAccess = (claims.realm_access ?? {}) as Record<string, unknown>
  const roles = Array.isArray(realmAccess.roles) ? (realmAccess.roles as string[]) : []
  // Allow-list governs BOTH branches: strip the realm's ROLE_ prefix for matching,
  // then accept the result only when it is LECTURER or STUDENT. Casting an untested
  // `normalized` to Role would let ROLE_ADMIN (or ADMIN) mint an out-of-contract
  // session that HomeRedirect treats as a lecturer.
  // Review: 2026-10-04, Pullfrog (ROLE_ fallback bypassed the allow-list)
  const role =
    roles
      .map((r) => (r.startsWith('ROLE_') ? r.slice('ROLE_'.length) : r))
      .find((r): r is Role => r === 'LECTURER' || r === 'STUDENT') ?? null
  if (!role) throw new Error('token_no_allowed_role')
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    userId: (claims.sub as string) ?? '',
    email: (claims.email as string) ?? '',
    role,
  }
}

/**
 * keycloak-js config derived from the one env var the app already has
 * (`https://<host>/realms/<realm>`) — no new VITE_* keys.
 */
function keycloakConfig(): { url: string; realm: string; clientId: string } {
  const match = /^(https?:\/\/[^/]+)\/realms\/([^/]+)\/?$/.exec(AUTHORITY)
  if (!match) {
    // Fail loudly at init instead of building wrong endpoint URLs that 404 on
    // /.well-known/openid-configuration with a confusing message. `name` lets
    // AuthGate show this message verbatim (it names the offending env var) —
    // a generic "could not initialize" hides the one fact that fixes a deploy.
    // Review: 2026-10-04, Pullfrog (config error invisible to the user)
    const err = new Error(
      `VITE_KEYCLOAK_AUTHORITY must have the form https://<host>/realms/<realm> — got: ${AUTHORITY || '(unset)'}`,
    )
    err.name = 'KeycloakConfigError'
    throw err
  }
  return { url: match[1], realm: match[2], clientId: CLIENT_ID }
}

/**
 * Derive the app-facing session from keycloak-js's in-memory tokens. Called
 * after `init()` and after every successful `updateToken()`, so `getSession()`
 * stays a synchronous read with no storage behind it.
 */
function buildSession(kc: Keycloak): AuthSession | null {
  if (!kc.authenticated || !kc.token || !kc.refreshToken || !kc.tokenParsed) return null
  // Freshness/expiry is keycloak-js's own business (updateToken(30)); nothing
  // consumer-side reads an expiry any more, so no expiry maths is re-derived here.
  return sessionFromTokens({
    access_token: kc.token,
    refresh_token: kc.refreshToken,
  })
}

/**
 * Bootstrap the adapter exactly once; `AuthGate` awaits this before the router
 * is mounted. The returned promise rejects on failure so the gate can show an
 * error state instead of an infinite spinner.
 */
export function initAuth(): Promise<void> {
  if (!initPromise) initPromise = runInit(true)
  return initPromise
}

async function runInit(silentSso: boolean): Promise<void> {
  const options: KeycloakInitOptions = {
    // check-sso: a reload must never force the Keycloak login page — an
    // unauthenticated visitor just ends up with `authenticated === false`
    // and the route guard sends them to /login.
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    // The Session Status iframe needs 3rd-party cookies (Keycloak is another
    // origin) and would block init until its iframe loads. With memory-only
    // tokens expiry is detected by the refresh path below anyway, so disable it.
    checkLoginIframe: false,
  }
  if (silentSso) {
    // Silent reload check: refresh SSO state in a hidden iframe instead of a
    // full-page bounce. keycloak-js itself clears this URI when the browser
    // blocks 3rd-party cookies (`silentCheckSsoFallback`, default true), so
    // restricted browsers degrade to a full-page `prompt=none` check rather
    // than losing the session (D8).
    options.silentCheckSsoRedirectUri = `${window.location.origin}/silent-check-sso.html`
  }

  const kc = new Keycloak(keycloakConfig())
  let authenticated = false
  try {
    authenticated = await kc.init(options)
  } catch (e) {
    if (silentSso) {
      // Fallback (D8): if the silent check-sso path fails outright (iframe
      // blocked/missing), retry WITHOUT it — keycloak-js then performs one
      // full-page `prompt=none` redirect, so a reload never strands the user.
      // A keycloak-js instance refuses to initialize twice, hence a fresh one.
      return runInit(false)
    }
    throw e
  }

  keycloak = kc
  if (authenticated) session = buildSession(kc)
}

/**
 * Redirect (full page) to Keycloak's hosted login form — authorization code +
 * PKCE, the browser never sees a password (D7). The promise never settles when
 * navigation starts, so callers only use `.catch()` to surface a blocked
 * redirect. The single call site is `LoginPage`.
 */
export function redirectToKeycloakLogin(): Promise<void> {
  const kc = keycloak
  if (!kc) return Promise.reject(new Error('keycloak_not_initialized'))
  return kc.login()
}

// Cross-tab lock name shared by every tab of this origin (Web Locks keys on it).
const REFRESH_LOCK = 'wgs.token.refresh'

/**
 * Silent refresh — deduped within this tab so concurrent 401s share one refresh
 * (`refreshPromise`); rejects with `REFRESH_DEAD` when the grant is gone (kc's
 * tokens cleared — 400 invalid_grant — or no session to derive) and with
 * `REFRESH_UNREACHABLE` only when a transport failure left the tokens intact
 * (session kept).
 */
export async function refreshSession(): Promise<AuthSession> {
  if (refreshPromise) return refreshPromise
  refreshPromise = exclusiveRefresh()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

/** One refresh: keycloak-js POSTs the refresh token; we re-derive the session from the new pair. */
async function refreshOnce(): Promise<AuthSession> {
  const kc = keycloak
  if (!kc) throw new Error('no_session')
  try {
    // 30s validity threshold: renew before the access token dies so the retry
    // that triggered us never races expiry. Resolves `false` when still fresh.
    await kc.updateToken(30)
  } catch {
    // keycloak-js clears kc's tokens AND rejects in the same tick on a 400
    // invalid_grant (keycloak.js:1507-1514), so the genuinely dead session
    // surfaces HERE — the buildSession-null branch below only runs when
    // updateToken resolves, which it never does with cleared tokens. Classify
    // on kc's own token state (the signal buildSession already uses): no
    // tokens = grant gone (400, or the no-refresh-token guard); tokens still
    // there = transport failure (network blip, 5xx) — preserve the session,
    // surface the error, no redirect. Filing a 400 as UNREACHABLE left a
    // tokenless session looping 401 with no /login recovery.
    // Review: 2026-10-04, Pullfrog (dead grant was filed as UNREACHABLE)
    if (!kc.authenticated || !kc.token || !kc.refreshToken) {
      clearSession()
      throw new Error(REFRESH_DEAD)
    }
    throw new Error(REFRESH_UNREACHABLE)
  }
  // Reachable only on the resolve path above (tokens still present): a refresh
  // succeeded but no usable session could be derived — e.g. token_no_allowed_role.
  const next = buildSession(kc)
  if (!next) {
    clearSession()
    throw new Error(REFRESH_DEAD)
  }
  session = next
  return next
}

async function exclusiveRefresh(): Promise<AuthSession> {
  // Cross-tab lock kept from Phase 2 (D9): refreshes stay serialized across this
  // origin's tabs. Since Phase 3 each tab holds its OWN keycloak-js tokens
  // (memory-only), so tabs never share a refresh token — there is nothing for a
  // peer tab to replay and nothing here a peer's refresh could update.
  // The old skip-if-fresh branch was removed 2026-10-04 (Pullfrog): it read only
  // THIS tab's in-memory session, which a peer's refresh can never make fresh, so
  // it could never fire — while its comment promised a cross-tab dedup that does
  // not exist (serialization alone cannot dedupe a spent refresh token).
  // Review: 2026-10-04, Pullfrog (lock serialized but could not dedupe)
  if (!navigator.locks) return refreshOnce() // no Web Locks (insecure/old context) → in-tab dedup only
  return navigator.locks.request(REFRESH_LOCK, () => refreshOnce())
}

/** Synchronous read of the in-memory session (never touches storage). */
export function getSession(): AuthSession | null {
  if (!session || !session.accessToken || !session.refreshToken || !session.role) return null
  return session
}

export function clearSession(): void {
  session = null
  // keycloak-js keeps its tokens in memory too — clear them alongside our
  // derived session so the two can never disagree (this is also what logout
  // means by "also call keycloak.clearToken()", D12).
  // Review: 2026-10-03, Phase 3 (D8, D12)
  keycloak?.clearToken()
}

export function logout(): void {
  // Full-page end-session redirect, not the old fire-and-forget XHR revoke:
  // the XHR never touched the browser's SSO cookie, so after sign-out the next
  // /login visit bounced the user straight back into the app (no way to switch
  // users without clearing cookies by hand). keycloak.logout() (default
  // logoutMethod GET) builds .../logout?client_id&id_token_hint&
  // post_logout_redirect_uri=<origin>/login and location.replace()s there:
  // Keycloak terminates the SSO session — which also revokes the tokens issued
  // under it, so the runbook §10.9 #9 "old refresh token fails" still holds —
  // then redirects back to /login, where AuthGate re-runs check-sso against a
  // dead session and LoginPage lands on the real login form (no redirect loop:
  // without an IdP session the authorize round-trip renders the form instead of
  // returning a code). clearSession() is deliberately NOT called first —
  // keycloak-js reads this.idToken while building the URL and clearToken()
  // would drop it, leaving id_token_hint empty. The page reload that follows
  // wipes our in-memory session anyway. Requires realm client attribute
  // post.logout.redirect.uris (runbook §10.3), else Keycloak shows its own
  // "logged out" page instead of returning to /login.
  // Review: 2026-10-03, D12 decided: kc.logout() full-page
  if (!keycloak) return clearSession() // never initialised → local sign-out only
  void keycloak.logout({ redirectUri: `${window.location.origin}/login` })
}
