import { Form, Input, Select, InputNumber, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const DB_TYPES = ['postgres', 'mysql', 'mariadb']

export function ConnectionFields() {
  const { t } = useTranslation()
  return (
    <>
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
    </>
  )
}
