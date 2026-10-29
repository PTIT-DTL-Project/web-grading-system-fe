import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Alert,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { DbFormValues } from './stepBuilder'
import { useStepBuilder } from './useStepBuilder'

const DB_TYPES = ['postgres', 'mysql', 'mariadb']

interface DbStepFormProps {
  stepType: 'DB_QUERY' | 'DB_SCHEMA_CHECK' | 'DB_MIGRATION'
  initialValues?: Partial<DbFormValues>
  onSave: (body: DbFormValues) => Promise<unknown>
  saving?: boolean
}

export function DbStepForm({
  stepType,
  initialValues,
  onSave,
  saving = false,
}: DbStepFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const builder = useStepBuilder({
    stepType,
    initialValues: {
      name: '',
      dbType: 'postgres',
      dbQuery: '',
      weight: 1,
      required: true,
      ...initialValues,
    },
    onSave: async (body) => {
      const payload: DbFormValues = {
        name: body.name,
        description: body.description,
        dbType: body.dbType,
        dbService: body.dbService,
        dbPort: body.dbPort,
        dbName: body.dbName,
        dbUser: body.dbUser,
        dbPassword: body.dbPassword,
        dbQuery: body.dbQuery,
        expectedRowCount: body.expectedRowCount,
        expectedColumnsText: body.expectedColumnsText,
        checks: body.checks,
        statements: body.statements,
        weight: body.weight ?? 1,
        timeoutMs: body.timeoutMs ?? null,
        required: body.required ?? true,
      }
      return onSave(payload)
    },
    saving,
  })

  return (
    <Form form={form} layout="vertical" initialValues={builder.values}>
      <Form.Item name="name" label={t('step.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label={t('step.description')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Typography.Text strong>{t('step.dbConnection')}</Typography.Text>
      <Form.Item name="dbType" label={t('step.dbType')}>
        <Select allowClear options={DB_TYPES.map((dbType) => ({ value: dbType, label: dbType }))} />
      </Form.Item>
      <Form.Item name="dbService" label={t('step.dbService')}>
        <Input placeholder="db" />
      </Form.Item>
      <Form.Item name="dbPort" label={t('step.dbPort')}>
        <InputNumber style={{ width: '100%' }} min={1} max={65535} />
      </Form.Item>
      <Form.Item name="dbName" label={t('step.dbName')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="dbUser" label={t('step.dbUser')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="dbPassword" label={t('step.dbPassword')} rules={[{ required: true }]}>
        <Input.Password />
      </Form.Item>

      {stepType === 'DB_QUERY' && (
        <>
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

      {stepType === 'DB_SCHEMA_CHECK' && (
        <>
          <Typography.Text strong>{t('step.checks')}</Typography.Text>
          <Form.List name="checks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <Space align="baseline">
                      <Form.Item {...restField} name={[name, 'kind']} label={t('step.checkKind')} rules={[{ required: true }]}>
                        <Select style={{ width: 180 }} options={['TABLE_EXISTS', 'COLUMN_EXISTS', 'INDEX_EXISTS', 'PRIMARY_KEY'].map((kind) => ({ value: kind, label: kind }))} />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                    {(form.getFieldValue([name, 'kind']) === 'COLUMN_EXISTS' || form.getFieldValue([name, 'kind']) === 'TABLE_EXISTS') && (
                      <Form.Item {...restField} name={[name, 'table_name']} label={t('step.tableName')} rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    )}
                    {form.getFieldValue([name, 'kind']) === 'COLUMN_EXISTS' && (
                      <>
                        <Form.Item {...restField} name={[name, 'column_name']} label={t('step.columnName')} rules={[{ required: true }]}>
                          <Input />
                        </Form.Item>
                        <Form.Item {...restField} name={[name, 'data_type']} label={t('step.dataType')}>
                          <Input placeholder="VARCHAR" />
                        </Form.Item>
                      </>
                    )}
                    {form.getFieldValue([name, 'kind']) === 'INDEX_EXISTS' && (
                      <Form.Item {...restField} name={[name, 'index_name']} label={t('step.indexName')} rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    )}
                    {form.getFieldValue([name, 'kind']) === 'PRIMARY_KEY' && (
                      <Form.Item {...restField} name={[name, 'column']} label={t('step.columnName')} rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    )}
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

      {stepType === 'DB_MIGRATION' && (
        <>
          <Typography.Text strong>{t('step.statements')}</Typography.Text>
          <Form.List name="statements">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ width: '100%' }}>
                    <Form.Item {...restField} name={[name, 'sql']} rules={[{ required: true }]} style={{ flex: 1 }}>
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
        <Button type="primary" disabled={saving} onClick={builder.handleSave} loading={saving}>
          {t('common.save')}
        </Button>
      </Space>
    </Form>
  )
}
