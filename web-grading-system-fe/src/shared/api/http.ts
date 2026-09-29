import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { clearIdentity, getIdentity } from '../auth/identity'
import { ApiError } from './errors'

/** Keys allowed in the backend envelope {status, message, data, error}. */
const ENVELOPE_KEYS = new Set(['status', 'message', 'data', 'error'])

/**
 * Detects the FormatRestResponse envelope and unwraps `data`.
 * The "every key is an envelope key" test keeps real payloads (which carry their own
 * fields such as `id`, `studentCode`, ...) from being mistaken for an envelope, while
 * still matching `{"status":200,"message":"Student scores updated"}` where `data` is
 * omitted entirely by @JsonInclude(NON_NULL).
 *
 * Throws ApiError when the envelope carries a failure status.
 */
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
  baseURL: '', // paths already include /api/v1; dev goes through the Vite proxy (see vite.config.ts)
  timeout: 30_000,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const identity = getIdentity()
  if (identity) config.headers.set('X-User-Id', identity.userId)
  return config
})

http.interceptors.response.use(
  (response) => {
    const { enveloped, value } = unwrapEnvelope(response.data)
    if (!enveloped) return response
    response.data = value
    return response
  },
  (error: AxiosError) => {
    // 401 = the server no longer accepts this identity (Keycloak era). 403 is a plain
    // authorization refusal (e.g. "Not owner" on results) and must NOT log the user out.
    if (error.response?.status === 401) {
      clearIdentity()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }

    const status = error.response?.status ?? 0
    if (status === 0) {
      // No response at all: gateway down / proxy target wrong / offline.
      return Promise.reject(new ApiError(0, '', undefined, 'network'))
    }

    try {
      unwrapEnvelope(error.response?.data) // throws ApiError for a failure envelope
    } catch (envelopeError) {
      return Promise.reject(envelopeError)
    }

    return Promise.reject(new ApiError(status, error.message, undefined, 'http'))
  },
)

/** GET that returns the unwrapped `data` payload. */
export async function getData<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await http.get<T>(url, { params, signal: options?.signal })
  return response.data
}

/** POST/PUT that returns the unwrapped `data` payload. */
export async function sendData<T, B>(
  url: string,
  method: 'post' | 'put',
  body?: B,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const response = await http[method]<T>(url, body, { signal: options?.signal })
  return response.data
}
