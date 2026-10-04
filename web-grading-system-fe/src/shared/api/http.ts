import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { clearIdentity } from '../auth/identity'
import { REFRESH_UNREACHABLE, refreshSession, getSession, clearSession } from '../auth/keycloak'
import { ApiError } from './errors'

/** Request config carrying the one-shot 401 retry marker (never `any`). */
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

const ENVELOPE_KEYS = new Set(['status', 'message', 'data', 'error'])

function unwrapEnvelope(body: unknown): { enveloped: boolean; value: unknown } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { enveloped: false, value: body }
  }
  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  const looksLikeEnvelope =
    keys.length > 0 &&
    keys.every((key) => ENVELOPE_KEYS.has(key)) &&
    typeof record.status === 'number'
  if (!looksLikeEnvelope) return { enveloped: false, value: body }

  const status = record.status as number
  const message = typeof record.message === 'string' ? record.message : ''
  if (status >= 400) {
    throw new ApiError(
      status,
      message,
      typeof record.error === 'string' ? record.error : undefined,
      'envelope',
    )
  }
  return { enveloped: true, value: record.data ?? null }
}

export const http: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 30_000,
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(err: unknown, token?: string): void {
  failedQueue.forEach((f) => (err ? f.reject(err) : f.resolve(token)))
  failedQueue = []
}

/** Drop the in-memory session and send the browser to the login screen. */
function signOut(): void {
  clearSession()
  clearIdentity()
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login')
  }
}

async function handle401(config: InternalAxiosRequestConfig): Promise<void> {
  if (isRefreshing) {
    // Wait for the in-flight refresh and adopt ITS outcome: a failure must
    // reject us too, otherwise we would retry with the very token that just
    // 401'd. Review: 2026-10-04, Pullfrog (waiters swallowed refresh failures)
    await new Promise<unknown>((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
    return
  }
  isRefreshing = true
  try {
    const session = await refreshSession()
    processQueue(null, session.accessToken)
    config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  } catch (e) {
    processQueue(e)
    // Only a dead grant ends the session (keycloak.ts already cleared its own
    // tokens there). A transport failure during refresh — 503, DNS blip, one
    // slow second on the token endpoint — keeps a still-valid session, so it
    // must not clear it and redirect: fail this request and let the user
    // continue. Review: 2026-10-04, Pullfrog (only a dead session signs out)
    if (e instanceof Error && e.message === REFRESH_UNREACHABLE) throw e
    signOut()
    throw e
  } finally {
    isRefreshing = false
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Attach the token whenever one exists — even within 30s of expiry. Skipping
  // it there made every request in that window go out anonymous, 401, and spend
  // a refresh round-trip; the 401 path renews the token if it actually died.
  // Review: 2026-10-04, Pullfrog (anonymous requests near expiry)
  const session = getSession()
  if (session) {
    config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const { enveloped, value } = unwrapEnvelope(response.data)
    if (!enveloped) return response
    response.data = value
    return response
  },
  async (error: AxiosError) => {
    const status = error.response?.status
    if (status === 401) {
      const original = error.config as RetriableConfig | undefined
      // Exactly one refresh-and-retry per logical request. A second 401 means
      // the refresh produced no token the gateway accepts (audience/issuer
      // mismatch, SSO session killed server-side, an endpoint that 401's a fresh
      // token): updateToken(30) can resolve without contacting Keycloak, so the
      // retry would be byte-identical and loop forever — the caller's promise
      // would never settle and the gateway would eat the loop. Give up instead.
      // Review: 2026-10-04, Pullfrog (unbounded 401 retry loop)
      if (original && !original._retried) {
        original._retried = true
        try {
          await handle401(original)
          return http(original)
        } catch {
          // refresh failed: request rejects (session kept for a transport
          // failure, sign-out already handled for a dead grant) — no retry.
          return Promise.reject(error)
        }
      }
      signOut()
    }

    const s = status ?? 0
    if (s === 0) {
      return Promise.reject(new ApiError(0, '', undefined, 'network'))
    }

    try {
      unwrapEnvelope(error.response?.data)
    } catch (envelopeError) {
      return Promise.reject(envelopeError)
    }

    return Promise.reject(new ApiError(s, error.message, undefined, 'http'))
  },
)

export async function getData<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await http.get<T>(url, { params, signal: options?.signal })
  return response.data
}

export async function sendData<T, B>(
  url: string,
  method: 'post' | 'put',
  body?: B,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await http[method]<T>(url, body, { signal: options?.signal })
  return response.data
}
