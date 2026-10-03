import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { clearIdentity } from '../auth/identity'
import { refreshSession, getSession, clearSession } from '../auth/keycloak'
import { ApiError } from './errors'

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

async function handle401(config: InternalAxiosRequestConfig): Promise<void> {
  if (isRefreshing) {
    await new Promise<unknown>((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    }).catch(() => {})
    return
  }
  isRefreshing = true
  try {
    const session = await refreshSession()
    processQueue(null, session.accessToken)
    config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  } catch (e) {
    processQueue(e)
    clearSession()
    clearIdentity()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw e
  } finally {
    isRefreshing = false
  }
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const session = getSession()
  if (session && !getSessionExpired()) {
    config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  }
  return config
})

function getSessionExpired(bufferMs = 30_000): boolean {
  const s = getSession()
  if (!s) return true
  return Date.now() >= s.expiresAt - bufferMs
}

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
      const original = error.config as InternalAxiosRequestConfig | undefined
      if (original) {
        try {
          await handle401(original)
          return http(original)
        } catch {
          return Promise.reject(error)
        }
      }
      clearSession()
      clearIdentity()
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
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
