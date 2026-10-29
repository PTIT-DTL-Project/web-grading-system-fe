import { getData } from '../http'

/** GET /api/v1/internal/assignments/{id}/config-schema — JSON Schema for HTTP_REQUEST step config. */
export function getConfigSchema(assignmentId: string): Promise<unknown> {
  return getData<unknown>(`/api/v1/internal/assignments/${assignmentId}/config-schema`)
}
