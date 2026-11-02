import { getData } from '../http'

/** GET /api/v1/internal/assignments/{id}/config-schema — JSON Schema for step config. */
export function getConfigSchema(assignmentId: string, type?: string): Promise<unknown> {
  const params = type ? `?type=${encodeURIComponent(type)}` : ''
  return getData<unknown>(`/api/v1/internal/assignments/${assignmentId}/config-schema${params}`)
}
