import type { TFunction } from 'i18next'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export type ApiErrorKind = 'http' | 'envelope' | 'network'

/**
 * Every failure the UI can see is normalised into this error so screens have exactly
 * one shape to render: `message` is the human text (backend `message` when the server
 * spoke, an i18n key lookup otherwise) and `status`/`detail` carry the diagnostics.
 */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string | undefined
  readonly kind: ApiErrorKind

  constructor(status: number, message: string, detail?: string, kind: ApiErrorKind = 'http') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.kind = kind
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Maps any thrown value to displayable text.
 *
 * - `network` (and HTTP status 0 / ≥502, i.e. a dead gateway or offline browser):
 *   translated `errors.network` — without this mapping the user would see axios's raw
 *   "Request failed with status code 502".
 * - `http` 5xx below 502: `errors.server(status)`; 404/403 get their own key and every
 *   other client error falls back to `errors.unknown`.
 * - `envelope`: the server's English `message` is the source of truth and is shown as
 *   is, with `: detail` appended when the envelope carries one
 *   ("Validation failed: name: must not be blank").
 */
export function getErrorMessage(error: unknown, t: TFunction): string {
  if (!isApiError(error)) return t('errors.unknown')
  if (error.kind === 'network') return t('errors.network')

  if (error.kind === 'envelope') {
    const message = error.message || t('errors.unknown')
    return error.detail ? `${message}: ${error.detail}` : message
  }

  if (error.status === 0 || error.status >= 502) return t('errors.network')
  if (error.status >= 500) return t('errors.server', { status: error.status })
  if (error.status === 404) return t('errors.notFound')
  if (error.status === 403) return t('errors.forbidden')
  return t('errors.unknown')
}

/** Thin `useTranslation()` wrapper so screens never hand-roll the mapping. */
export function useApiErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation()
  // Review: 2026-10-05, Pullfrog — a fresh closure per render made any consumer dep array unstable.
  return useCallback((error: unknown) => getErrorMessage(error, t), [t])
}
