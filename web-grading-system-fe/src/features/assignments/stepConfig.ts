import type { StepCreateBody } from '../../shared/types/assignment'

// Review: 2026-10-05 — shared step-config helpers live here so Fast Refresh
// keeps working in the component files that import them.
export type StepDraft = Omit<StepCreateBody, 'stepOrder'>

export const SYSTEM_VARIABLES = ['submission_id', 'assignment_id', 'student_id']

// Review: 2026-10-05 — java.net.http rejects these at request time, while the
// backend validator does not, so the editor must block them before save.
export const RESTRICTED_HEADERS = ['connection', 'content-length', 'expect', 'host', 'upgrade']

// Review: 2026-10-05 — one connection editor shared by DB_QUERY, DB_SCHEMA_CHECK and
// DB_MIGRATION, so the three types cannot drift apart.
export function buildConnection(values: Record<string, any>): Record<string, unknown> | undefined {
  const connection: Record<string, unknown> = {}
  if (values.dbType) connection.db_type = values.dbType
  if (values.dbService?.trim()) connection.db_service = values.dbService.trim()
  if (values.dbPort !== undefined && values.dbPort !== null) connection.db_port = values.dbPort
  if (values.dbName?.trim()) connection.database = values.dbName.trim()
  if (values.dbUser) connection.username = values.dbUser
  if (values.dbPassword) connection.password = values.dbPassword
  return Object.keys(connection).length ? connection : undefined
}
