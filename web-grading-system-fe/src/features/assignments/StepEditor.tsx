import { useState } from 'react'
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Segmented,
  Tabs,
  Alert,
  Checkbox,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { StepType } from '../../shared/types/assignment'
import type { StepDraft } from './stepConfig'
import { ConnectionFields } from './ConnectionFields'
import { RESTRICTED_HEADERS, buildConnection } from './stepConfig'
interface StepEditorProps {
  step?: {
    id?: string
    name?: string
    stepType?: StepType
    config?: string
    expectedResult?: string
    weight?: number
    timeoutMs?: number
    required?: boolean
  }
  onSave: (body: StepDraft) => Promise<unknown>
  onCancel: () => void
  saving: boolean
  disabled?: boolean
  availableVariables?: string[]
}

const STEP_TYPES: StepType[] = [
  'HTTP_REQUEST',
  'DB_QUERY',
  'DB_SCHEMA_CHECK',
  'DB_MIGRATION',
  'EXTRACT',
  'DELAY',
]

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const ASSERTION_KINDS = ['status', 'body_structure', 'body_equals', 'json_path', 'contains', 'field_equals']

const INVALID_JSON = '__invalid_json__'

type NamePathLike = string | (string | number)[]

function AssertionFields({ index }: { index: number }) {
  const { t } = useTranslation()
  const kind = Form.useWatch(['assertions', index, 'kind']) as string | undefined

  return (
    <>
      {kind === 'status' && (
        <Form.Item name={[index, 'equals']} label={t('step.assertionEquals')} rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={100} max={599} />
        </Form.Item>
      )}
      {kind === 'json_path' && (
        <>
          <Form.Item name={[index, 'path']} label={t('step.assertionPath')} rules={[{ required: true }]}>
            <Input placeholder="$.id" />
          </Form.Item>
          <Form.Item name={[index, 'exists']} label={t('step.assertionExists')} valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
        </>
      )}
      {kind === 'contains' && (
        <Form.Item name={[index, 'text']} label={t('step.assertionText')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      )}
      {kind === 'field_equals' && (
        <>
          <Form.Item name={[index, 'path']} label={t('step.assertionPath')} rules={[{ required: true }]}>
            <Input placeholder="$.id" />
          </Form.Item>
          <Form.Item name={[index, 'equals']} label={t('step.assertionEquals')} rules={[{ required: true }]}>
            <Input placeholder="${bookId}" />
          </Form.Item>
        </>
      )}
      {(kind === 'body_structure' || kind === 'body_equals') && (
        <Form.Item name={[index, 'json']} label={t('step.assertionJson')} rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder={t('step.configPlaceholder')} />
        </Form.Item>
      )}
    </>
  )
}

function CheckFields({ index }: { index: number }) {
  const { t } = useTranslation()
  const kind = Form.useWatch(['checks', index, 'kind']) as string | undefined

  return (
    <>
      {(kind === 'TABLE_EXISTS' || kind === 'COLUMN_EXISTS' || kind === 'PRIMARY_KEY') && (
        <Form.Item name={[index, 'table_name']} label={t('step.tableName')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      )}
      {kind === 'COLUMN_EXISTS' && (
        <>
          <Form.Item name={[index, 'column_name']} label={t('step.columnName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name={[index, 'data_type']} label={t('step.dataType')}>
            <Input placeholder="VARCHAR" />
          </Form.Item>
        </>
      )}
      {kind === 'INDEX_EXISTS' && (
        <Form.Item name={[index, 'index_name']} label={t('step.indexName')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      )}
      {kind === 'PRIMARY_KEY' && (
        <Form.Item name={[index, 'column']} label={t('step.columnName')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      )}
    </>
  )
}

export function StepEditor({
  step,
  onSave,
  onCancel,
  saving,
  disabled = false,
  availableVariables = [],
}: StepEditorProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const stepType = Form.useWatch('stepType', form) as StepType | undefined
  const [advanced, setAdvanced] = useState(false)
  const [bodyMode, setBodyMode] = useState<'none' | 'raw'>('none')
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const guided =
    !advanced &&
    (stepType === 'HTTP_REQUEST' ||
      stepType === 'DB_QUERY' ||
      stepType === 'DB_SCHEMA_CHECK' ||
      stepType === 'DB_MIGRATION')
  const allValues = Form.useWatch([], form) as Record<string, any> | undefined

  const mustParse = (raw: unknown, field: NamePathLike): unknown => {
    if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return undefined
    if (typeof raw !== 'string') return raw
    try {
      return JSON.parse(raw)
    } catch {
      form.setFields([{ name: field, errors: [t('step.invalidJson')] }])
      throw new Error(INVALID_JSON)
    }
  }

  const toPairs = (rows: any[] | undefined): Record<string, string> | undefined => {
    const entries = (rows ?? []).filter(
      (row) => row && row.enabled !== false && String(row.key ?? '').trim() !== '',
    )
    if (!entries.length) return undefined
    return Object.fromEntries(entries.map((row) => [String(row.key).trim(), String(row.value ?? '')]))
  }

  const buildAssertion = (
    assertion: any,
    index: number,
    parse: (raw: unknown, field: NamePathLike) => unknown = mustParse,
  ): Record<string, unknown> => {
    switch (assertion.kind) {
      case 'status':
        return { kind: assertion.kind, equals: assertion.equals }
      case 'json_path':
        return { kind: assertion.kind, path: assertion.path, exists: assertion.exists ?? true }
      case 'contains':
        return { kind: assertion.kind, text: assertion.text }
      case 'field_equals':
        return { kind: assertion.kind, path: assertion.path, equals: assertion.equals }
      default:
        return { kind: assertion.kind, json: parse(assertion.json, ['assertions', index, 'json']) }
    }
  }

  const buildHttpConfig = (
    values: Record<string, any>,
    parse: (raw: unknown, field: NamePathLike) => unknown = mustParse,
  ): Record<string, unknown> => {
    const config: Record<string, unknown> = { method: values.httpMethod, path: values.httpPath }
    if (values.httpExpectedStatus !== undefined && values.httpExpectedStatus !== null) {
      config.expected_status = values.httpExpectedStatus
    }
    const headers = toPairs(values.headers)
    if (headers) config.headers = headers
    const queryParams = toPairs(values.queryParams)
    if (queryParams) config.query_params = queryParams
    if (bodyMode === 'raw') {
      const body = parse(values.httpBody, 'httpBody')
      if (body !== undefined) config.body = body
    }
    if (values.assertions?.length) {
      config.assertions = values.assertions.map((assertion: any, index: number) =>
        buildAssertion(assertion, index, parse),
      )
    }
    if (values.extracts?.length) config.extract = values.extracts
    return config
  }

  const buildDbConfig = (
    values: Record<string, any>,
  ): { config: Record<string, unknown>; expectedResult?: Record<string, unknown> } => {
    const config: Record<string, unknown> = { query: values.dbQuery }
    const connection = buildConnection(values)
    if (connection) config.connection = connection
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
    // Review: 2026-10-05 — mirror `expected` into top-level `expectedResult`, matching observed working payloads.
    if (hasExpected) config.expected = expected
    return { config, expectedResult: hasExpected ? expected : undefined }
  }

  const buildSchemaConfig = (values: Record<string, any>): Record<string, unknown> => {
    const config: Record<string, unknown> = {}
    const connection = buildConnection(values)
    if (connection) config.connection = connection
    config.checks = (values.checks ?? []).map((check: any) => {
      switch (check.kind) {
        case 'TABLE_EXISTS':
          return { kind: check.kind, table_name: check.table_name }
        case 'COLUMN_EXISTS': {
          const built: Record<string, unknown> = {
            kind: check.kind,
            table_name: check.table_name,
            column_name: check.column_name,
          }
          if (check.data_type?.trim()) built.data_type = check.data_type.trim()
          return built
        }
        case 'INDEX_EXISTS':
          return { kind: check.kind, index_name: check.index_name }
        case 'PRIMARY_KEY':
          return { kind: check.kind, table_name: check.table_name, column: check.column }
        default:
          return { kind: check.kind }
      }
    })
    return config
  }

  const buildMigrationConfig = (values: Record<string, any>): Record<string, unknown> => {
    const config: Record<string, unknown> = {}
    const connection = buildConnection(values)
    if (connection) config.connection = connection
    config.statements = (values.statements ?? [])
      .map((row: any) => String(row?.sql ?? '').trim())
      .filter(Boolean)
    return config
  }

  const enabledHeaders = (values: Record<string, any>): { index: number; key: string }[] =>
    (values.headers ?? [])
      .map((row: any, index: number) => ({ index, key: String(row?.key ?? '') }))
      .filter((row: { index: number; key: string }) => row.key.trim() !== '' && values.headers[row.index]?.enabled !== false)

  const restrictedHeaderIndexes = (values: Record<string, any>): { index: number; key: string }[] =>
    enabledHeaders(values).filter((row) => RESTRICTED_HEADERS.includes(row.key.trim().toLowerCase()))

  const collectUsedVars = (values: Record<string, any>): string[] => {
    const used = new Set<string>()
    const scan = (text: unknown) => {
      if (typeof text !== 'string') return
      for (const match of text.matchAll(/\$\{([^}]+)\}/g)) used.add(match[1])
    }
    scan(values.httpPath)
    scan(values.httpBody)
    ;(values.headers ?? []).forEach((row: any) => scan(row?.value))
    ;(values.queryParams ?? []).forEach((row: any) => scan(row?.value))
    scan(values.dbQuery)
    return [...used]
  }

  const httpWarnings = (): { key: string; severity: 'warning' | 'error'; text: string }[] => {
    if (!guided || stepType !== 'HTTP_REQUEST' || !allValues) return []
    const warnings: { key: string; severity: 'warning' | 'error'; text: string }[] = []
    const hasStatus = allValues.httpExpectedStatus !== undefined && allValues.httpExpectedStatus !== null
    const hasAssertions = (allValues.assertions ?? []).length > 0
    if (!hasStatus && !hasAssertions) {
      warnings.push({ key: 'no-checks', severity: 'warning', text: t('step.noChecksWarn') })
    }
    const bodyText = typeof allValues.httpBody === 'string' ? allValues.httpBody.trim() : ''
    if (bodyMode === 'raw' && bodyText && ['GET', 'HEAD', 'DELETE'].includes(allValues.httpMethod)) {
      warnings.push({ key: 'ignored-body', severity: 'warning', text: t('step.ignoredBodyWarn') })
    }
    const enabled = enabledHeaders(allValues)
    const restricted = enabled.filter((row) => RESTRICTED_HEADERS.includes(row.key.trim().toLowerCase()))
    restricted.forEach((row) =>
      warnings.push({
        key: `restricted-${row.index}`,
        severity: 'error',
        text: t('step.restrictedHeaderError', { name: row.key.trim() }),
      }),
    )
    const hasExactContentType = enabled.some((row) => row.key.trim() === 'Content-Type')
    const hasLowerContentType =
      !hasExactContentType &&
      enabled.some((row) => row.key.trim().toLowerCase() === 'content-type')
    if (bodyMode === 'raw' && bodyText && hasLowerContentType) {
      warnings.push({ key: 'content-type-case', severity: 'warning', text: t('step.contentTypeCaseWarn') })
    }
    const unknownVars = collectUsedVars(allValues).filter((name) => !availableVariables.includes(name))
    if (unknownVars.length) {
      warnings.push({
        key: 'unknown-vars',
        severity: 'warning',
        text: t('step.unresolvedVarWarn', { vars: unknownVars.join(', ') }),
      })
    }
    return warnings
  }

  const formatBody = () => {
    const raw = form.getFieldValue('httpBody')
    if (typeof raw !== 'string' || !raw.trim()) return
    try {
      form.setFieldsValue({ httpBody: JSON.stringify(JSON.parse(raw), null, 2) })
    } catch {
      form.setFields([{ name: 'httpBody', errors: [t('step.invalidJson')] }])
    }
  }

  const copyVar = (name: string) => {
    if (!navigator.clipboard) return
    navigator.clipboard
      .writeText(`\${${name}}`)
      .then(() => {
        setCopiedVar(name)
        window.setTimeout(() => setCopiedVar((current) => (current === name ? null : current)), 1200)
      })
      .catch(() => {})
  }

  const previewText = (): string => {
    if (!guided || !allValues) return ''
    const silent = (raw: unknown): unknown => {
      if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return undefined
      if (typeof raw !== 'string') return raw
      return JSON.parse(raw)
    }
    try {
      let payload: unknown
      if (stepType === 'HTTP_REQUEST') {
        payload = { config: buildHttpConfig(allValues, silent) }
      } else if (stepType === 'DB_QUERY') {
        const built = buildDbConfig(allValues)
        payload = { config: built.config, ...(built.expectedResult ? { expectedResult: built.expectedResult } : {}) }
      } else if (stepType === 'DB_SCHEMA_CHECK') {
        payload = { config: buildSchemaConfig(allValues) }
      } else if (stepType === 'DB_MIGRATION') {
        payload = { config: buildMigrationConfig(allValues) }
      } else {
        return ''
      }
      return JSON.stringify(payload, null, 2)
    } catch {
      return ''
    }
  }

  // Review: 2026-10-05 — PlanCard owns success, failure, and closing, so do not reset here and discard editor state.
  const handleOk = async () => {
    const values = await form.validateFields()
    if (guided && stepType === 'HTTP_REQUEST') {
      const restricted = restrictedHeaderIndexes(values)
      if (restricted.length) {
        restricted.forEach((row) =>
          form.setFields([
            { name: ['headers', row.index, 'key'], errors: [t('step.restrictedHeaderError', { name: row.key.trim() })] },
          ]),
        )
        return
      }
    }
    let config: unknown
    let expectedResult: unknown
    try {
      if (guided && stepType === 'HTTP_REQUEST') {
        config = buildHttpConfig(values)
      } else if (guided && stepType === 'DB_QUERY') {
        const built = buildDbConfig(values)
        config = built.config
        expectedResult = built.expectedResult
      } else if (guided && stepType === 'DB_SCHEMA_CHECK') {
        config = buildSchemaConfig(values)
      } else if (guided && stepType === 'DB_MIGRATION') {
        config = buildMigrationConfig(values)
      } else {
        config = mustParse(values.configRaw, 'configRaw')
        expectedResult = mustParse(values.expectedRaw, 'expectedRaw')
      }
    } catch (e) {
      if (e instanceof Error && e.message === INVALID_JSON) return
      throw e
    }
    await onSave({
      name: values.name,
      description: values.description || undefined,
      stepType: values.stepType,
      config,
      expectedResult: expectedResult === undefined ? undefined : (expectedResult as Record<string, unknown>),
      weight: values.weight ?? 1,
      timeoutMs: values.timeoutMs ?? null,
      required: values.required ?? true,
    })
  }

  const guidedTypes =
    stepType === 'HTTP_REQUEST' ||
    stepType === 'DB_QUERY' ||
    stepType === 'DB_SCHEMA_CHECK' ||
    stepType === 'DB_MIGRATION'

  return (
    <Form form={form} layout="vertical" initialValues={step}>
      <Form.Item name="name" label={t('step.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label={t('step.description')}>
        <Input />
      </Form.Item>
      <Form.Item name="stepType" label={t('step.type')} rules={[{ required: true }]}>
        <Select
          options={STEP_TYPES.map((value) => ({ value, label: t(`step.typeOptions.${value}`) }))}
          onChange={() => setAdvanced(false)}
        />
      </Form.Item>

      {guidedTypes && (
        <Form.Item label={t('step.mode')}>
          <Segmented
            options={[
              { value: false, label: t('step.guided') },
              { value: true, label: t('step.advanced') },
            ]}
            value={advanced}
            onChange={(value) => setAdvanced(value)}
          />
        </Form.Item>
      )}

      {guided && stepType === 'HTTP_REQUEST' && (
        <>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="httpMethod" label={t('step.httpMethod')} rules={[{ required: true }]} style={{ width: 130 }}>
              <Select options={HTTP_METHODS.map((method) => ({ value: method, label: method }))} />
            </Form.Item>
            <Form.Item
              name="httpPath"
              label={t('step.httpPath')}
              rules={[{ required: true }, { pattern: /^\//, message: t('step.httpPath') }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="/api/v1/books/${bookId}" />
            </Form.Item>
          </Space>
          <Tabs
            defaultActiveKey="params"
            items={[
              {
                key: 'params',
                label: t('step.tabParams'),
                children: (
                  <Form.List name="queryParams">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} align="baseline">
                            <Form.Item {...restField} name={[name, 'enabled']} valuePropName="checked" initialValue noStyle>
                              <Checkbox title={t('step.enabled')} />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'key']}>
                              <Input placeholder={t('step.key')} />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'value']}>
                              <Input placeholder={t('step.value')} />
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => remove(name)} />
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          {t('step.addParam')}
                        </Button>
                      </>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'headers',
                label: t('step.tabHeaders'),
                children: (
                  <Form.List name="headers">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} align="baseline">
                            <Form.Item {...restField} name={[name, 'enabled']} valuePropName="checked" initialValue noStyle>
                              <Checkbox title={t('step.enabled')} />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'key']}>
                              <Input placeholder={t('step.key')} />
                            </Form.Item>
                            <Form.Item {...restField} name={[name, 'value']}>
                              <Input placeholder={t('step.value')} />
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => remove(name)} />
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          {t('step.addHeader')}
                        </Button>
                      </>
                    )}
                  </Form.List>
                ),
              },
              {
                key: 'body',
                label: t('step.tabBody'),
                children: (
                  <>
                    <Space style={{ marginBottom: 8 }}>
                      <Segmented
                        options={[
                          { value: 'none', label: t('step.bodyNone') },
                          { value: 'raw', label: t('step.bodyRaw') },
                        ]}
                        value={bodyMode}
                        onChange={(value: 'none' | 'raw') => setBodyMode(value)}
                      />
                      {bodyMode === 'raw' && <Button onClick={formatBody}>{t('step.formatJson')}</Button>}
                    </Space>
                    {bodyMode === 'raw' && (
                      <Form.Item name="httpBody" label={t('step.body')}>
                        <Input.TextArea rows={6} placeholder={t('step.configPlaceholder')} />
                      </Form.Item>
                    )}
                  </>
                ),
              },
              {
                key: 'tests',
                label: t('step.tabTests'),
                children: (
                  <>
                    <Form.Item name="httpExpectedStatus" label={t('step.httpExpectedStatus')}>
                      <InputNumber style={{ width: '100%' }} min={100} max={599} />
                    </Form.Item>
                    <Typography.Text strong>{t('step.assertions')}</Typography.Text>
                    <Form.List name="assertions">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <div
                              key={key}
                              style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12, marginBottom: 8 }}
                            >
                              <Space align="baseline">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'kind']}
                                  label={t('step.assertionKind')}
                                  rules={[{ required: true }]}
                                >
                                  <Select
                                    style={{ width: 160 }}
                                    options={ASSERTION_KINDS.map((kind) => ({ value: kind, label: kind }))}
                                  />
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => remove(name)} />
                              </Space>
                              <AssertionFields index={name as number} />
                            </div>
                          ))}
                          <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                            {t('step.addAssertion')}
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </>
                ),
              },
              {
                key: 'variables',
                label: t('step.tabVariables'),
                children: (
                  <>
                    <Typography.Text strong>{t('step.extract')}</Typography.Text>
                    <Form.List name="extracts">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} align="baseline">
                              <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}>
                                <Input placeholder={t('step.extractName')} />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'from']} initialValue="response_body">
                                <Input placeholder={t('step.extractFrom')} />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'expression']} rules={[{ required: true }]}>
                                <Input placeholder={t('step.extractExpression')} />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => remove(name)} />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                            {t('step.addExtract')}
                          </Button>
                        </>
                      )}
                    </Form.List>
                    <Typography.Text strong>{t('step.availableVariables')}</Typography.Text>
                    <div style={{ marginTop: 8 }}>
                      <Space wrap>
                        {availableVariables.map((name) => (
                          <Button
                            key={name}
                            size="small"
                            icon={copiedVar === name ? <CheckOutlined /> : <CopyOutlined />}
                            title={t('step.copyHint')}
                            onClick={() => copyVar(name)}
                          >
                            {`\${${name}}`}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  </>
                ),
              },
            ]}
          />
        </>
      )}

      {guided && stepType === 'DB_QUERY' && (
        <>
          <ConnectionFields />
          <Form.Item name="dbQuery" label={t('step.dbQuery')} rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="SELECT title FROM books WHERE id = ${bookId}" />
          </Form.Item>
          <Form.Item name="expectedRowCount" label={t('step.expectedRowCount')}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="expectedColumnsText" label={t('step.expectedColumns')}>
            <Input placeholder={t('step.expectedColumnsPlaceholder')} />
          </Form.Item>
        </>
      )}

      {guided && stepType === 'DB_SCHEMA_CHECK' && (
        <>
          <ConnectionFields />
          <Typography.Text strong>{t('step.checks')}</Typography.Text>
          <Form.List name="checks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <Space align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'kind']}
                        label={t('step.checkKind')}
                        rules={[{ required: true }]}
                      >
                        <Select
                          style={{ width: 180 }}
                          options={['TABLE_EXISTS', 'COLUMN_EXISTS', 'INDEX_EXISTS', 'PRIMARY_KEY'].map((kind) => ({
                            value: kind,
                            label: kind,
                          }))}
                        />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                    <CheckFields index={name as number} />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  {t('step.addCheck')}
                </Button>
              </>
            )}
          </Form.List>
        </>
      )}

      {guided && stepType === 'DB_MIGRATION' && (
        <>
          <ConnectionFields />
          <Typography.Text strong>{t('step.statements')}</Typography.Text>
          <Form.List name="statements">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ width: '100%' }}>
                    <Form.Item
                      {...restField}
                      name={[name, 'sql']}
                      rules={[{ required: true }]}
                      style={{ flex: 1 }}
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  {t('step.addStatement')}
                </Button>
              </>
            )}
          </Form.List>
          <Alert type="info" showIcon message={t('step.mysqlDdlWarn')} style={{ marginTop: 8 }} />
        </>
      )}

      {(stepType === 'EXTRACT' || stepType === 'DELAY') && (
        <Alert
          type="warning"
          showIcon
          message={t('step.unsupportedStepWarn', { type: stepType })}
          style={{ marginBottom: 16 }}
        />
      )}

      {!guided && (
        <>
          <Form.Item name="configRaw" label={t('step.config')} rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder={t('step.configPlaceholder')} />
          </Form.Item>
          {(stepType === 'DB_QUERY' || stepType === 'DB_SCHEMA_CHECK' || stepType === 'DB_MIGRATION') && (
            <Form.Item name="expectedRaw" label={t('step.expectedResult')}>
              <Input.TextArea rows={3} placeholder={t('step.expectedResultPlaceholder')} />
            </Form.Item>
          )}
        </>
      )}

      {httpWarnings().map((warning) => (
        <Alert key={warning.key} type={warning.severity} showIcon message={warning.text} style={{ marginBottom: 8 }} />
      ))}

      {guided && previewText() !== '' && (
        <>
          <Typography.Text strong>{t('step.preview')}</Typography.Text>
          <pre style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, overflow: 'auto' }}>
            {previewText()}
          </pre>
        </>
      )}

      <Form.Item name="weight" label={t('step.weight')} initialValue={1}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name="timeoutMs" label={t('step.timeout')} initialValue={null}>
        <InputNumber min={0} placeholder={t('step.timeoutPlaceholder')} />
      </Form.Item>
      <Form.Item name="required" label={t('step.required')} valuePropName="checked" initialValue>
        <Switch />
      </Form.Item>
      <Space>
        <Button type="primary" disabled={disabled} onClick={handleOk} loading={saving}>
          {t('common.save')}
        </Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  )
}
