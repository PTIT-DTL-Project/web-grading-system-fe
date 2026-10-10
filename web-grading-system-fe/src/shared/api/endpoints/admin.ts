import { http } from '../http'

export interface ImportRowResult {
  row: number
  username: string
  role: string
  outcome: 'created' | 'skipped' | 'failed'
  reason: string | null
}

export interface ImportSummary {
  created: Record<string, number>
  skipped: number
  failed: ImportRowResult[]
}

/** POST /api/v1/admin/users/import — bulk account import (ADMIN only). */
export function importUsers(file: File, options?: { signal?: AbortSignal }): Promise<ImportSummary> {
  const form = new FormData()
  form.append('file', file)
  return http
    .post<ImportSummary>('/api/v1/admin/users/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
    })
    .then((response) => response.data)
}
