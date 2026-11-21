import { Descriptions, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/tokens'
import type { StepDetailModel } from './stepDetail'
import { isRecord, maskHeaders, maskSensitiveValues, stringPairs } from './stepDetail'

interface StepDetailViewProps {
  /** `contract`: request + required response only. `full`: everything the config holds. */
  model: StepDetailModel
  variant: 'contract' | 'full'
}

function JsonBlock({ text }: { text: string }) {
  return (
    <pre
      style={{
        background: colors.layoutBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 12,
        overflow: 'auto',
        maxHeight: 240,
        margin: 0,
      }}
    >
      {text}
    </pre>
  )
}

function PairsTable({ rows }: { rows: [string, string][] }) {
  return (
    <Descriptions
      column={1}
      size="small"
      items={rows.map(([key, value]) => ({
        key,
        label: <code>{key}</code>,
        children: <code style={{ wordBreak: 'break-all' }}>{value}</code>,
      }))}
    />
  )
}

/** Field key -> existing label key; unknown fields fall back to the raw key. */
const ASSERTION_FIELD_LABELS: Record<string, string> = {
  path: 'step.assertionPath',
  equals: 'step.assertionEquals',
  text: 'step.assertionText',
  exists: 'step.assertionExists',
  value: 'step.assertionValue',
  pattern: 'step.assertionPattern',
  json: 'step.assertionJson',
}

/**
 * Renders whatever fields the assertion carries instead of a per-kind switch.
 * The switch silently dropped `json_path_equals`, `array_length`, `contains_item`,
 * `greater_than`, `less_than`, `matches_regex` and `any_of`: those assertions showed
 * only their kind tag, so "Giá trị tại đường dẫn bằng" appeared with no path/expected
 * value at all. Review: 2026-11-21, user report on the step detail view.
 */
function AssertionBlock({ assertion, depth = 0 }: { assertion: unknown; depth?: number }) {
  const { t } = useTranslation()
  if (!isRecord(assertion) || typeof assertion.kind !== 'string') {
    return <Typography.Text type="secondary">{JSON.stringify(assertion)}</Typography.Text>
  }
  const kind: string = assertion.kind
  const rows: [string, string][] = []
  const jsonFields: { label: string; value: unknown }[] = []
  const nested: unknown[] = []

  Object.entries(assertion).forEach(([key, value]) => {
    if (key === 'kind' || value === undefined || value === null) return
    if (key === 'assertions') {
      if (Array.isArray(value)) nested.push(...value)
      return
    }
    const label = t(ASSERTION_FIELD_LABELS[key] ?? key, { defaultValue: key })
    if (isRecord(value) || Array.isArray(value)) {
      jsonFields.push({ label, value })
      return
    }
    rows.push([label, typeof value === 'boolean' ? (value ? t('common.yes') : t('common.no')) : String(value)])
  })
  // The grader treats a missing `exists` on json_path as "must exist"; say so instead
  // of dropping the row and leaving the assertion looking half-configured.
  if (kind === 'json_path' && !('exists' in assertion)) {
    rows.push([t('step.assertionExists'), t('common.yes')])
  }

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        <Tag>{t(`step.assertionKindOptions.${kind}`, { defaultValue: kind })}</Tag>
        {rows.length > 0 && <PairsTable rows={rows} />}
        {jsonFields.map(({ label, value }) => (
          <div key={label}>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <JsonBlock text={JSON.stringify(value, null, 2)} />
          </div>
        ))}
        {nested.length > 0 && (
          <>
            <Typography.Text type="secondary">{t('step.assertionAnyOfHint')}</Typography.Text>
            {nested.map((inner, index) => (
              <AssertionBlock key={index} assertion={inner} depth={depth + 1} />
            ))}
          </>
        )}
      </Space>
    </div>
  )
}

/**
 * Expandable per-step detail shared by lecturer and student views.
 * Students see the contract (request + required response, secrets masked);
 * lecturers see the full config they authored.
 */
export function StepDetailView({ model, variant }: StepDetailViewProps) {
  const { t } = useTranslation()
  const full = variant === 'full'
  const { config } = model

  const renderHttp = () => {
    if (!config) return null
    const method = typeof config.method === 'string' ? config.method : 'GET'
    const path = typeof config.path === 'string' ? config.path : '/'
    const expectedStatus = typeof config.expected_status === 'number' ? config.expected_status : null
    let headers = stringPairs(config.headers)
    let query = stringPairs(config.query_params)
    let bodySource: unknown = config.body
    if (!full) {
      // Review: 2026-10-09, Pullfrog — credential-bearing query/body values
      // reach students verbatim from the backend, so mask them here. The
      // `full` (lecturer) variant keeps the authored values.
      headers = maskHeaders(headers)
      query = maskHeaders(query)
      bodySource = maskSensitiveValues(bodySource)
    }
    const body = bodySource !== undefined ? JSON.stringify(bodySource, null, 2) : null
    const assertions = Array.isArray(config.assertions) ? config.assertions : []
    const extracts = Array.isArray(config.extract) ? config.extract : []
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <div>
          <Tag color="blue">{method}</Tag> <code style={{ wordBreak: 'break-all' }}>{path}</code>{' '}
          {expectedStatus !== null && <Tag color="green">{t('step.expectStatus', { status: expectedStatus })}</Tag>}
        </div>
        {query.length > 0 && (
          <div>
            <Typography.Text strong>{t('step.tabParams')}</Typography.Text>
            <PairsTable rows={query} />
          </div>
        )}
        {headers.length > 0 && (
          <div>
            <Typography.Text strong>{t('step.tabHeaders')}</Typography.Text>
            <PairsTable rows={headers} />
          </div>
        )}
        {body !== null && (
          <div>
            <Typography.Text strong>{t('step.body')}</Typography.Text>
            <JsonBlock text={body} />
          </div>
        )}
        {full &&
          assertions.map((assertion: unknown, index: number) => (
            <AssertionBlock key={index} assertion={assertion} />
          ))}
        {full && extracts.length > 0 && (
          <div>
            <Typography.Text strong>{t('step.extract')}</Typography.Text>
            {extracts.map((entry: unknown, index: number) => {
              const row = isRecord(entry) ? entry : {}
              return (
                // Was `bookId ← response_body : body.id`; the grader-facing triple says
                // nothing to a student, so spell out where the value comes from.
                <Typography.Text key={index} style={{ display: 'block' }}>
                  {t('step.extractSentence', {
                    name: String(row.name ?? ''),
                    source: t(`step.extractSource.${String(row.from ?? '')}`, {
                      defaultValue: String(row.from ?? ''),
                    }),
                    expression: String(row.expression ?? ''),
                  })}
                </Typography.Text>
              )
            })}
          </div>
        )}
      </Space>
    )
  }

  const renderDbQuery = () => {
    if (!config) return null
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {full && <ConnectionBlock config={config} />}
        <div>
          <Typography.Text strong>{t('step.dbQuery')}</Typography.Text>
          <JsonBlock text={typeof config.query === 'string' ? config.query : ''} />
        </div>
        {full && isRecord(config.expected) && (
          <div>
            <Typography.Text strong>{t('step.expectedResult')}</Typography.Text>
            <PairsTable rows={expectedQueryRows(config.expected, t)} />
          </div>
        )}
      </Space>
    )
  }

  const renderDelay = () => {
    if (!config) return null
    const duration = config.duration_ms
    return (
      <Typography.Text>
        {t('step.delaySentence', { ms: String(duration ?? '?') })}
      </Typography.Text>
    )
  }

  const renderExtract = () => {
    if (!config) return null
    const rows = Array.isArray(config.extract) ? config.extract : []
    if (rows.length === 0) return null
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        {rows.map((entry: unknown, index: number) => {
          const row = isRecord(entry) ? entry : {}
          return (
            <Typography.Text key={index}>
              {t('step.extractSentence', {
                name: String(row.name ?? ''),
                source: t(`step.extractSource.${String(row.from ?? '')}`, {
                  defaultValue: String(row.from ?? ''),
                }),
                expression: String(row.expression ?? ''),
              })}
            </Typography.Text>
          )
        })}
      </Space>
    )
  }

  const renderSchemaCheck = () => {
    if (!config) return null
    const checks = Array.isArray(config.checks) ? config.checks : []
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {full && <ConnectionBlock config={config} />}
        <div>
          <Typography.Text strong>{t('step.checks')}</Typography.Text>
          {checks.length === 0 && (
            <Typography.Text type="secondary">{t('step.noChecksDeclared')}</Typography.Text>
          )}
          {checks.map((check: unknown, index: number) => (
            <div key={index} style={{ marginTop: 6 }}>
              <Typography.Text>
                <Tag color="geekblue">{t('step.checkLabel', { index: index + 1 })}</Tag>
                {checkSentence(check, t)}
              </Typography.Text>
              {full && (
                <PairsTable
                  rows={checkFields(check).map(([key, value]) => [
                    t(`step.checkField.${key}`, { defaultValue: key }),
                    value,
                  ])}
                />
              )}
            </div>
          ))}
        </div>
      </Space>
    )
  }

  const renderMigration = () => {
    if (!config) return null
    const statements = Array.isArray(config.statements) ? config.statements : []
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {full && <ConnectionBlock config={config} />}
        <div>
          <Typography.Text strong>{t('step.statements')}</Typography.Text>
          {statements.map((statement: unknown, index: number) => (
            <div key={index} style={{ marginTop: 6 }}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                {t('step.statementLabel', { index: index + 1 })}
              </Typography.Text>
              <JsonBlock text={typeof statement === 'string' ? statement : JSON.stringify(statement)} />
            </div>
          ))}
        </div>
      </Space>
    )
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space wrap>
        <Tag>#{model.order}</Tag>
        <Typography.Text strong>{model.name}</Typography.Text>
        <Tag>{t(`step.typeOptions.${model.stepType}`, { defaultValue: model.stepType })}</Tag>
        <Typography.Text type="secondary">
          {t('step.weight')}: {model.weight}
        </Typography.Text>
        {full && (
          <>
            {model.timeoutMs != null && (
              <Typography.Text type="secondary">
                {t('step.timeout')}: {model.timeoutMs} ms
              </Typography.Text>
            )}
            {model.required && <Tag color="red">{t('step.required')}</Tag>}
          </>
        )}
      </Space>
      {model.description && <Typography.Text type="secondary">{model.description}</Typography.Text>}
      {!config && <Typography.Text type="secondary">{t('step.invalidJson')}</Typography.Text>}
      {model.stepType === 'HTTP_REQUEST' && renderHttp()}
      {model.stepType === 'DB_QUERY' && renderDbQuery()}
      {model.stepType === 'DB_SCHEMA_CHECK' && renderSchemaCheck()}
      {model.stepType === 'DB_MIGRATION' && renderMigration()}
      {model.stepType === 'DELAY' && renderDelay()}
      {model.stepType === 'EXTRACT' && renderExtract()}
    </Space>
  )
}

function ConnectionBlock({ config }: { config: Record<string, any> }) {
  const { t } = useTranslation()
  if (!isRecord(config.connection)) return null
  const connection = config.connection
  const rows: [string, string][] = []
  if (connection.db_type) rows.push([t('step.dbType'), String(connection.db_type)])
  if (connection.db_service) rows.push([t('step.dbService'), String(connection.db_service)])
  if (connection.db_port != null) rows.push([t('step.dbPort'), String(connection.db_port)])
  if (connection.database) rows.push([t('step.dbName'), String(connection.database)])
  if (connection.username) rows.push([t('step.dbUser'), String(connection.username)])
  if (connection.password) rows.push([t('step.dbPassword'), String(connection.password)])
  if (!rows.length) return null
  return (
    <div>
      <Typography.Text strong>{t('step.dbConnection')}</Typography.Text>
      <PairsTable rows={rows} />
    </div>
  )
}

type Translate = (key: string, options?: Record<string, unknown>) => string

/** `expected: {row_count, columns:[...]}` described in words instead of raw JSON. */
function expectedQueryRows(expected: Record<string, any>, t: Translate): [string, string][] {
  const rows: [string, string][] = []
  if (expected.row_count !== undefined && expected.row_count !== null) {
    rows.push([t('step.expectedRowCount'), String(expected.row_count)])
  }
  if (Array.isArray(expected.columns) && expected.columns.length > 0) {
    rows.push([t('step.expectedColumns'), expected.columns.map((c: unknown) => String(c)).join(', ')])
  }
  const known = new Set(['row_count', 'columns'])
  Object.entries(expected)
    .filter(([key]) => !known.has(key))
    .forEach(([key, value]) => rows.push([key, String(value ?? '')]))
  return rows
}


/**
 * One-line, human sentence per DB schema check, e.g.
 * `TABLE_EXISTS books` → "Bảng «books» phải tồn tại".
 * The raw check kind and field names are grader vocabulary; students used to see
 * nothing but `COLUMN_EXISTS books.id bigint`, which is unreadable.
 * Review: 2026-11-21, user report on the step detail view.
 */
function checkSentence(check: unknown, t: Translate): string {
  if (!isRecord(check) || typeof check.kind !== 'string') return JSON.stringify(check)
  const table = String(check.table_name ?? '')
  switch (check.kind) {
    case 'TABLE_EXISTS':
      return t('step.checkSentenceTable', { table })
    case 'COLUMN_EXISTS':
      return check.data_type
        ? t('step.checkSentenceColumnType', {
            table,
            column: String(check.column_name ?? ''),
            type: String(check.data_type),
          })
        : t('step.checkSentenceColumn', { table, column: String(check.column_name ?? '') })
    case 'INDEX_EXISTS':
      return t('step.checkSentenceIndex', {
        table,
        index: String(check.index_name ?? ''),
      })
    case 'PRIMARY_KEY':
      return t('step.checkSentencePrimaryKey', { table, column: String(check.column ?? '') })
    default:
      return JSON.stringify(check)
  }
}

/** Technical view of the same check, for the lecturer variant. */
function checkFields(check: unknown): [string, string][] {
  if (!isRecord(check)) return []
  return Object.entries(check).map(([key, value]) => [key, String(value ?? '')])
}
