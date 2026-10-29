import type { StepType } from '../../shared/types/assignment'

/** A row of key/value pairs with an enabled flag (for headers/query_params). */
export interface KeyValueRow {
  key: string
  value: string
  enabled?: boolean
}

/** A row in data[] loop. */
export interface DataRow {
  [key: string]: any
}

/** An extract entry. */
export interface ExtractEntry {
  name: string
  from: string
  expression: string
  as?: 'scalar' | 'json'
  fallback?: string
}

/** An assertion entry. */
export interface AssertionEntry {
  kind: string
  [key: string]: any
}

/** Form values for HTTP_REQUEST step. */
export interface HttpFormValues {
  name: string
  description?: string
  httpMethod: string
  httpPath: string
  httpExpectedStatus?: number | null
  headers: KeyValueRow[]
  queryParams: KeyValueRow[]
  httpBody?: string
  assertions: AssertionEntry[]
  extracts: ExtractEntry[]
  dataRows: DataRow[]
  weight?: number
  timeoutMs?: number | null
  required?: boolean
  autoInjectHeaders?: KeyValueRow[]
}

/** Form values for DB steps. */
export interface DbFormValues {
  name: string
  description?: string
  dbType: string
  dbService?: string
  dbPort?: number | null
  dbName?: string
  dbUser?: string
  dbPassword?: string
  dbQuery?: string
  expectedRowCount?: number | null
  expectedColumnsText?: string
  checks?: { kind: string; [key: string]: any }[]
  statements?: { sql: string }[]
  weight?: number
  timeoutMs?: number | null
  required?: boolean
}

/** Convert key/value rows to a map object, skipping disabled/empty keys. */
export function toPairs(
  rows: KeyValueRow[] | undefined,
): Record<string, string> | undefined {
  const entries = (rows ?? []).filter(
    (row) => row && row.enabled !== false && String(row.key ?? '').trim() !== '',
  )
  if (!entries.length) return undefined
  return Object.fromEntries(entries.map((row) => [String(row.key).trim(), String(row.value ?? '')]))
}

/** Parse a JSON text area value safely. Returns undefined if empty/invalid. */
export function parseJsonOrUndefined(raw: unknown): unknown {
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return undefined
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/** Build HTTP_REQUEST config JSON from guided form values. */
export function buildHttpConfig(values: HttpFormValues): Record<string, unknown> {
  const config: Record<string, unknown> = { method: values.httpMethod, path: values.httpPath }

  if (values.httpExpectedStatus !== undefined && values.httpExpectedStatus !== null) {
    config.expected_status = values.httpExpectedStatus
  }

  const headers = toPairs(values.headers)
  if (headers) config.headers = headers

  const queryParams = toPairs(values.queryParams)
  if (queryParams) config.query_params = queryParams

  const body = parseJsonOrUndefined(values.httpBody)
  if (body !== undefined) config.body = body

  if (values.assertions?.length) {
    config.assertions = values.assertions.map((assertion) => {
      switch (assertion.kind) {
        case 'status':
          return { kind: assertion.kind, equals: assertion.equals }
        case 'json_path':
          return { kind: assertion.kind, path: assertion.path, exists: assertion.exists ?? true }
        case 'contains':
          return { kind: assertion.kind, text: assertion.text }
        case 'field_equals':
          return { kind: assertion.kind, path: assertion.path, equals: assertion.equals }
        case 'array_length':
        case 'contains_item':
        case 'json_path_equals':
          return { kind: assertion.kind, path: assertion.path, equals: assertion.equals }
        case 'greater_than':
        case 'less_than':
          return { kind: assertion.kind, path: assertion.path, value: assertion.value }
        case 'matches_regex':
          return { kind: assertion.kind, path: assertion.path, pattern: assertion.pattern }
        case 'any_of':
          return { kind: assertion.kind, assertions: assertion.assertions ?? [] }
        default:
          return { kind: assertion.kind, json: assertion.json }
      }
    })
  }

  if (values.extracts?.length) {
    config.extract = values.extracts.map((entry) => ({
      name: entry.name,
      from: entry.from,
      expression: entry.expression,
      ...(entry.as && entry.as !== 'scalar' ? { as: entry.as } : {}),
      ...(entry.fallback !== undefined && entry.fallback !== '' ? { fallback: entry.fallback } : {}),
    }))
  }

  if (values.dataRows?.length) {
    config.data = values.dataRows
  }

  // auto_inject_headers: key/value templates injected into subsequent steps in the same plan.
  if (values.autoInjectHeaders?.length) {
    const aiHeaders = toPairs(values.autoInjectHeaders)
    if (aiHeaders) config.auto_inject_headers = aiHeaders
  }

  return config
}

/** Build DB config JSON from guided form values. */
export function buildDbConfig(values: DbFormValues): {
  config: Record<string, unknown>
  expectedResult?: Record<string, unknown>
} {
  const config: Record<string, unknown> = {}
  if (values.dbQuery) config.query = values.dbQuery

  const connection: Record<string, unknown> = {}
  if (values.dbType) connection.db_type = values.dbType
  if (values.dbService?.trim()) connection.db_service = values.dbService.trim()
  if (values.dbPort !== undefined && values.dbPort !== null) connection.db_port = values.dbPort
  if (values.dbName?.trim()) connection.database = values.dbName.trim()
  if (values.dbUser) connection.username = values.dbUser
  if (values.dbPassword) connection.password = values.dbPassword
  if (Object.keys(connection).length) config.connection = connection

  const expected: Record<string, unknown> = {}
  if (values.expectedRowCount !== undefined && values.expectedRowCount !== null) {
    expected.row_count = values.expectedRowCount
  }
  const columns = String(values.expectedColumnsText ?? '')
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean)
  if (columns.length) expected.columns = columns
  const hasExpected = Object.keys(expected).length > 0
  if (hasExpected) config.expected = expected

  return { config, expectedResult: hasExpected ? expected : undefined }
}

/** Reverse-map stored HTTP config back into guided form values. */
export function reverseMapHttpConfig(config: Record<string, any>): Partial<HttpFormValues> {
  const toRows = (obj: unknown): KeyValueRow[] =>
    obj && typeof obj === 'object' && !Array.isArray(obj)
      ? Object.entries(obj as Record<string, unknown>).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : JSON.stringify(value ?? ''),
          enabled: true,
        }))
      : []

  return {
    httpMethod: config.method,
    httpPath: config.path,
    httpExpectedStatus: config.expected_status,
    headers: toRows(config.headers),
    queryParams: toRows(config.query_params),
    httpBody: config.body !== undefined ? JSON.stringify(config.body, null, 2) : undefined,
    assertions: Array.isArray(config.assertions)
      ? config.assertions.map((assertion: any) => ({
          kind: assertion?.kind,
          equals: assertion?.equals,
          path: assertion?.path,
          exists: assertion?.exists ?? true,
          text: assertion?.text,
          value: assertion?.value,
          pattern: assertion?.pattern,
          json:
            assertion?.json !== undefined ? JSON.stringify(assertion.json, null, 2) : undefined,
          assertions: assertion?.assertions,
        }))
      : [],
    extracts: Array.isArray(config.extract)
      ? config.extract.map((entry: any) => ({
          name: entry?.name,
          from: entry?.from ?? 'response_body',
          expression: entry?.expression,
          as: entry?.as ?? 'scalar',
          fallback: entry?.fallback,
        }))
      : [],
    dataRows: Array.isArray(config.data) ? config.data : [],
    autoInjectHeaders: toRows(config.auto_inject_headers),
  }
}

/** Reverse-map stored DB config back into guided form values. */
export function reverseMapDbConfig(config: Record<string, any>): Partial<DbFormValues> {
  const connection =
    config.connection && typeof config.connection === 'object' ? config.connection : {}
  const expected =
    config.expected && typeof config.expected === 'object'
      ? config.expected
      : {}
  return {
    dbType: connection.db_type,
    dbService: connection.db_service,
    dbPort: connection.db_port,
    dbName: connection.database,
    dbUser: connection.username,
    dbPassword: connection.password,
    dbQuery: config.query,
    expectedRowCount: expected.row_count,
    expectedColumnsText: Array.isArray(expected.columns) ? expected.columns.join(', ') : undefined,
    checks: Array.isArray(config.checks) ? config.checks : [],
    statements: Array.isArray(config.statements) ? config.statements : [],
  }
}

/** Determine if a step type uses the guided form (vs Advanced JSON). */
export function isGuidedType(stepType: StepType): boolean {
  return (
    stepType === 'HTTP_REQUEST' ||
    stepType === 'DB_QUERY' ||
    stepType === 'DB_SCHEMA_CHECK' ||
    stepType === 'DB_MIGRATION'
  )
}
