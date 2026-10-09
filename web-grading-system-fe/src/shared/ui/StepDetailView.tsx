import { Descriptions, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { colors } from '../theme/tokens'
import type { StepDetailModel } from './stepDetail'
import { isRecord, maskHeaders, stringPairs } from './stepDetail'

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

function AssertionBlock({ assertion }: { assertion: unknown }) {
  const { t } = useTranslation()
  if (!isRecord(assertion) || typeof assertion.kind !== 'string') {
    return <Typography.Text type="secondary">{JSON.stringify(assertion)}</Typography.Text>
  }
  const kind: string = assertion.kind
  const rows: [string, string][] = []
  if (kind === 'status') rows.push([t('step.assertionEquals'), String(assertion.equals ?? '')])
  if (kind === 'contains') rows.push([t('step.assertionText'), String(assertion.text ?? '')])
  if (kind === 'json_path') {
    rows.push([t('step.assertionPath'), String(assertion.path ?? '')])
    rows.push([t('step.assertionExists'), String(assertion.exists ?? true)])
  }
  if (kind === 'field_equals') {
    rows.push([t('step.assertionPath'), String(assertion.path ?? '')])
    rows.push([t('step.assertionEquals'), String(assertion.equals ?? '')])
  }
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={4}>
      <Tag>{kind}</Tag>
      {rows.length > 0 && <PairsTable rows={rows} />}
      {(kind === 'body_structure' || kind === 'body_equals') && assertion.json !== undefined && (
        <>
          <Typography.Text type="secondary">{t('step.assertionJson')}</Typography.Text>
          <JsonBlock text={JSON.stringify(assertion.json, null, 2)} />
        </>
      )}
    </Space>
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
    if (!full) headers = maskHeaders(headers)
    const query = stringPairs(config.query_params)
    const body = config.body !== undefined ? JSON.stringify(config.body, null, 2) : null
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
                <Typography.Text key={index} style={{ display: 'block' }} code>
                  {String(row.name ?? '')} ← {String(row.from ?? '')} : {String(row.expression ?? '')}
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
            <JsonBlock text={JSON.stringify(config.expected, null, 2)} />
          </div>
        )}
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
          {checks.map((check: unknown, index: number) => (
            <Typography.Text key={index} style={{ display: 'block' }} code>
              {checkText(check)}
            </Typography.Text>
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
            <JsonBlock
              key={index}
              text={typeof statement === 'string' ? statement : JSON.stringify(statement)}
            />
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
        <Tag>{model.stepType}</Tag>
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

function checkText(check: unknown): string {
  if (!isRecord(check) || typeof check.kind !== 'string') return JSON.stringify(check)
  switch (check.kind) {
    case 'TABLE_EXISTS':
      return `TABLE_EXISTS ${String(check.table_name ?? '')}`
    case 'COLUMN_EXISTS':
      return `COLUMN_EXISTS ${String(check.table_name ?? '')}.${String(check.column_name ?? '')}${
        check.data_type ? ` ${String(check.data_type)}` : ''
      }`
    case 'INDEX_EXISTS':
      return `INDEX_EXISTS ${String(check.index_name ?? '')}`
    case 'PRIMARY_KEY':
      return `PRIMARY_KEY ${String(check.table_name ?? '')}(${String(check.column ?? '')})`
    default:
      return JSON.stringify(check)
  }
}
