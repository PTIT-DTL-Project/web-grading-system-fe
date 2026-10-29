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
  Tabs,
  Segmented,
  Alert,
  Checkbox,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { HttpFormValues } from './stepBuilder'
import { RESTRICTED_HEADERS, DYNAMIC_VARIABLES } from './stepConfig'
import { toPairs } from './stepBuilder'
import { useStepBuilder } from './useStepBuilder'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const ASSERTION_KINDS = [
  'status',
  'body_structure',
  'body_equals',
  'json_path',
  'contains',
  'field_equals',
  'array_length',
  'contains_item',
  'json_path_equals',
  'greater_than',
  'less_than',
  'matches_regex',
  'any_of',
]

interface HttpStepFormProps {
  initialValues?: Partial<HttpFormValues>
  onSave: (body: HttpFormValues) => Promise<unknown>
  saving?: boolean
  availableVariables?: string[]
}

export function HttpStepForm({
  initialValues,
  onSave,
  saving = false,
  availableVariables = [],
}: HttpStepFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [bodyMode, setBodyMode] = useState<'none' | 'raw'>('none')
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('params')

  const builder = useStepBuilder({
    stepType: 'HTTP_REQUEST',
    initialValues: {
      name: '',
      httpMethod: 'GET',
      httpPath: '',
      headers: [],
      queryParams: [],
      assertions: [],
      extracts: [],
      dataRows: [],
      weight: 1,
      required: true,
      ...initialValues,
    },
    onSave: async (body) => {
      const payload: HttpFormValues = {
        name: body.name,
        description: body.description,
        httpMethod: body.httpMethod,
        httpPath: body.httpPath,
        httpExpectedStatus: body.httpExpectedStatus,
        headers: body.headers ?? [],
        queryParams: body.queryParams ?? [],
        httpBody: body.httpBody,
        assertions: body.assertions ?? [],
        extracts: body.extracts ?? [],
        dataRows: body.dataRows ?? [],
        weight: body.weight ?? 1,
        timeoutMs: body.timeoutMs ?? null,
        required: body.required ?? true,
        autoInjectHeaders: body.autoInjectHeaders,
      }
      return onSave(payload)
    },
    saving,
    availableVariables,
  })

  const collectUsedVars = (values: HttpFormValues): string[] => {
    const used = new Set<string>()
    const scan = (text: unknown) => {
      if (typeof text !== 'string') return
      for (const match of text.matchAll(/\$\{([^}]+)\}/g)) used.add(match[1])
    }
    scan(values.httpPath)
    scan(values.httpBody)
    ;(values.headers ?? []).forEach((row) => scan(row?.value))
    ;(values.queryParams ?? []).forEach((row) => scan(row?.value))
    return [...used]
  }

  const httpWarnings = (): { key: string; severity: 'warning' | 'error'; text: string }[] => {
    const warnings: { key: string; severity: 'warning' | 'error'; text: string }[] = []
    const hasStatus = builder.values.httpExpectedStatus != null
    const hasAssertions = (builder.values.assertions ?? []).length > 0
    if (!hasStatus && !hasAssertions) {
      warnings.push({ key: 'no-checks', severity: 'warning', text: t('step.noChecksWarn') })
    }
    const bodyText = typeof builder.values.httpBody === 'string' ? builder.values.httpBody.trim() : ''
    if (bodyMode === 'raw' && bodyText && ['GET', 'HEAD', 'DELETE'].includes(builder.values.httpMethod)) {
      warnings.push({ key: 'ignored-body', severity: 'warning', text: t('step.ignoredBodyWarn') })
    }
    const enabled = toPairs(builder.values.headers)
      ? Object.entries(toPairs(builder.values.headers)!).map(([key]) => ({ key }))
      : []
    const restricted = enabled.filter((row) => RESTRICTED_HEADERS.includes(row.key.trim().toLowerCase()))
    restricted.forEach((row) =>
      warnings.push({
        key: `restricted-${row.key}`,
        severity: 'error',
        text: t('step.restrictedHeaderError', { name: row.key.trim() }),
      }),
    )
    const unknownVars = collectUsedVars(builder.values as HttpFormValues).filter(
      (name) => !availableVariables.includes(name) && !name.startsWith('$'),
    )
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

  const handleOk = async () => {
    try {
      await builder.validate()
    } catch {
      return
    }

    const restricted = RESTRICTED_HEADERS.filter((h) =>
      (builder.values.headers ?? []).some(
        (row: { key?: string; enabled?: boolean }) =>
          row.enabled !== false && row.key?.trim().toLowerCase() === h.toLowerCase(),
      ),
    )
    if (restricted.length) {
      restricted.forEach((name: string) => {
        form.setFields([
          {
            name: [
              'headers',
              builder.values.headers.findIndex((r: { key?: string }) => r.key === name),
              'key',
            ],
            errors: [t('step.restrictedHeaderError', { name })],
          },
        ])
      })
      setActiveTab('headers')
      return
    }

    try {
      await builder.handleSave()
    } catch {
      // submitError already set by hook
    }
  }

  const assertionField = (index: number) => {
    const kind = form.getFieldValue(['assertions', index, 'kind']) as string | undefined
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
        {(kind === 'array_length' || kind === 'contains_item' || kind === 'json_path_equals') && (
          <>
            <Form.Item name={[index, 'path']} label={t('step.assertionPath')} rules={[{ required: true }]}>
              <Input placeholder="$.items" />
            </Form.Item>
            <Form.Item name={[index, 'equals']} label={t('step.assertionEquals')} rules={[{ required: true }]}>
              <Input placeholder="4" />
            </Form.Item>
          </>
        )}
        {(kind === 'greater_than' || kind === 'less_than') && (
          <>
            <Form.Item name={[index, 'path']} label={t('step.assertionPath')} rules={[{ required: true }]}>
              <Input placeholder="$.price" />
            </Form.Item>
            <Form.Item name={[index, 'value']} label={t('step.assertionValue')} rules={[{ required: true }]}>
              <Input placeholder="100" />
            </Form.Item>
          </>
        )}
        {kind === 'matches_regex' && (
          <>
            <Form.Item name={[index, 'path']} label={t('step.assertionPath')} rules={[{ required: true }]}>
              <Input placeholder="$.code" />
            </Form.Item>
            <Form.Item name={[index, 'pattern']} label={t('step.assertionPattern')} rules={[{ required: true }]}>
              <Input placeholder="^ABC-\\d+$" />
            </Form.Item>
          </>
        )}
        {kind === 'any_of' && (
          <Form.Item
            name={[index, 'assertions']}
            label={t('step.assertionAnyOf')}
            rules={[{ required: true }]}
          >
            <Input.TextArea
              rows={3}
              placeholder='[{"kind":"status","equals":200},{"kind":"json_path","path":"$.id"}]'
            />
          </Form.Item>
        )}
        {(kind === 'body_structure' || kind === 'body_equals') && (
          <Form.Item name={[index, 'json']} label={t('step.assertionJson')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder={t('step.configPlaceholder')} />
          </Form.Item>
        )}
      </>
    )
  }

  const extractField = (index: number) => (
    <>
      <Form.Item name={[index, 'name']} label={t('step.extractName')} rules={[{ required: true }]}>
        <Input placeholder={t('step.extractName')} />
      </Form.Item>
      <Form.Item name={[index, 'from']} label={t('step.extractFrom')} initialValue="response_body">
        <Input placeholder={t('step.extractFrom')} />
      </Form.Item>
      <Form.Item name={[index, 'expression']} label={t('step.extractExpression')} rules={[{ required: true }]}>
        <Input placeholder={t('step.extractExpression')} />
      </Form.Item>
      <Form.Item name={[index, 'as']} label={t('step.extractAs')} initialValue="scalar">
        <Select style={{ width: 120 }}>
          <Select.Option value="scalar">{t('step.extractAsScalar')}</Select.Option>
          <Select.Option value="json">{t('step.extractAsJson')}</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item name={[index, 'fallback']} label={t('step.extractFallback')}>
        <Input placeholder={t('step.extractFallback')} />
      </Form.Item>
    </>
  )

  return (
    <Form form={form} layout="vertical" initialValues={builder.values}>
      <Form.Item name="name" label={t('step.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label={t('step.description')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Space style={{ width: '100%' }} align="start">
        <Form.Item name="httpMethod" label={t('step.httpMethod')} rules={[{ required: true }]} style={{ width: 130 }}>
          <Select options={HTTP_METHODS.map((method) => ({ value: method, label: method }))} />
        </Form.Item>
        <Form.Item
          name="httpPath"
          label={t('step.httpPath')}
          rules={[{ required: true }, { pattern: /^\//, message: t('step.httpPathPattern') }]}
          style={{ flex: 1 }}
        >
          <Input placeholder="/api/v1/books/${bookId}" />
        </Form.Item>
      </Space>

      <Form.Item name="httpExpectedStatus" label={t('step.httpExpectedStatus')}>
        <InputNumber style={{ width: '100%' }} min={100} max={599} />
      </Form.Item>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'params',
          forceRender: true,
          label: t('step.tabParams'),
          children: (
            <Form.List name="headers">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Space key={key} align="baseline">
                      <Form.Item  name={[name, 'enabled']} valuePropName="checked" initialValue noStyle>
                        <Checkbox title={t('step.enabled')} />
                      </Form.Item>
                      <Form.Item  name={[name, 'key']}>
                        <Input placeholder={t('step.key')} />
                      </Form.Item>
                      <Form.Item  name={[name, 'value']}>
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
          key: 'headers',
          forceRender: true,
          label: t('step.tabHeaders'),
          children: (
            <Form.List name="queryParams">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <Space key={key} align="baseline">
                      <Form.Item  name={[name, 'enabled']} valuePropName="checked" initialValue noStyle>
                        <Checkbox title={t('step.enabled')} />
                      </Form.Item>
                      <Form.Item  name={[name, 'key']}>
                        <Input placeholder={t('step.key')} />
                      </Form.Item>
                      <Form.Item  name={[name, 'value']}>
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
          key: 'body',
          forceRender: true,
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
                  onChange={(value: 'none' | 'raw') => {
                    if (value === 'none') form.setFieldsValue({ httpBody: undefined })
                    setBodyMode(value)
                  }}
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
          forceRender: true,
          label: t('step.tabTests'),
          children: (
            <>
              <Typography.Text strong>{t('step.assertions')}</Typography.Text>
              <Form.List name="assertions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }) => (
                      <div key={key} style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <Space align="baseline">
                          <Form.Item  name={[name, 'kind']} label={t('step.assertionKind')} rules={[{ required: true }]}>
                            <Select style={{ width: 160 }} options={ASSERTION_KINDS.map((kind) => ({ value: kind, label: kind }))} />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Space>
                        {assertionField(name as number)}
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
          forceRender: true,
          label: t('step.tabVariables'),
          children: (
            <>
              <Typography.Text strong>{t('step.extract')}</Typography.Text>
              <Form.List name="extracts">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }) => (
                      <Space key={key} align="baseline">
                        {extractField(name as number)}
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
                <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 6 }}>
                  Variables starting with `$` are generated fresh at runtime (never stored).
                </Typography.Text>
                <Space wrap>
                  {availableVariables.map((name) => {
                    const isDynamic = DYNAMIC_VARIABLES.includes(name)
                    return (
                      <Button
                        key={name}
                        size="small"
                        icon={copiedVar === name ? <CheckOutlined /> : <CopyOutlined />}
                        title={t('step.copyHint')}
                        onClick={() => copyVar(name)}
                        style={{
                          ...(isDynamic && {
                            borderColor: '#52c41a',
                            color: '#52c41a',
                            '&:hover': { borderColor: '#52c41a' },
                          }),
                        }}
                      >
                        {isDynamic ? '⚡ ' : ''}{`\${${name}}`}
                      </Button>
                    )
                  })}
                </Space>
              </div>
            </>
          ),
        },
        {
          key: 'data',
          forceRender: true,
          label: 'Dữ liệu lặp',
          children: (
            <>
              <Typography.Text strong>Dòng dữ liệu (lặp)</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                Mỗi dòng là một bản ghi, hệ thống sẽ chạy step này N lần (tối đa 10 dòng). Các trường trong bản ghi được dùng bằng tên trường.
              </Typography.Text>
              <Form.List name="dataRows">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }) => (
                      <div key={key} style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', gap: 8 }}>
                        <Form.Item  name={[name, 'title']} rules={[{ required: true }]}>
                          <Input placeholder="Tên sách" />
                        </Form.Item>
                        <Form.Item  name={[name, 'year']}>
                          <InputNumber placeholder="Năm" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item  name={[name, 'price']}>
                          <InputNumber placeholder="Giá" style={{ width: 120 }} />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} disabled={fields.length >= 10}>
                      {fields.length >= 10 ? 'Đã đủ 10 dòng (giới hạn)' : 'Thêm dòng dữ liệu'}
                    </Button>
                  </>
                )}
              </Form.List>
            </>
          ),
        },
      ]} />

      <Typography.Text strong>{t('step.autoInjectHeaderLabel')}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        {t('step.autoInjectHeaderHint')}
      </Typography.Text>
      <Form.List name="autoInjectHeaders">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }) => (
              <Space key={key} align="baseline">
                <Form.Item  name={[name, 'key']} rules={[{ required: true }]}>
                  <Input placeholder="Authorization" />
                </Form.Item>
                <Form.Item  name={[name, 'value']} rules={[{ required: true }]}>
                  <Input placeholder="Bearer ${accessToken}" />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} />
              </Space>
            ))}
            <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
              {t('step.addAutoInjectHeader')}
            </Button>
          </>
        )}
      </Form.List>

      {httpWarnings().map((warning) => (
        <Alert key={warning.key} type={warning.severity} showIcon message={warning.text} style={{ marginBottom: 8 }} />
      ))}

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
        <Button type="primary" disabled={saving} onClick={handleOk} loading={saving}>
          {t('common.save')}
        </Button>
      </Space>
    </Form>
  )
}
