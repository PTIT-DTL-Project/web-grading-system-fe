import { Card, Modal, Typography, Button, Space, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { CopyOutlined } from '@ant-design/icons'

interface SchemaPreviewProps {
  schema?: Record<string, unknown> | null
  open?: boolean
  onClose: () => void
}

export function SchemaPreview({ schema, open = false, onClose }: SchemaPreviewProps) {
  const { t } = useTranslation()

  if (!open || !schema) return null

  const schemaJson = JSON.stringify(schema, null, 2)
  const required = Array.isArray(schema.required) ? schema.required : []

  return (
    <Modal
      open={open}
      title={t('schemaTitle') || 'JSON Schema standard'}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      <Card style={{ marginBottom: 16 }}>
        <Typography.Text strong>
          {typeof schema.title === 'string' ? schema.title : 'HTTP Request Step Config'}
        </Typography.Text>
        {typeof schema.description === 'string' && schema.description && (
          <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
            {schema.description}
          </Typography.Text>
        )}
        <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
          Draft-07 · Required fields: {(required as string[]).join(', ') || 'none'}
        </Typography.Text>
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Typography.Text strong>{t('step.properties', 'Properties')}</Typography.Text>
        {Object.entries(schema.properties || {}).map(([key, value]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <Typography.Text strong style={{ fontSize: 12 }}>{key}</Typography.Text>
            <pre style={{ margin: 0, padding: 8, background: '#fafafa', borderRadius: 6, overflow: 'auto', fontSize: 11 }}>
              {JSON.stringify((value as Record<string, unknown>) ?? null, null, 2)}
            </pre>
          </div>
        ))}
      </Space>

      <Space style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(schemaJson)
            message.success(t('common.copied', 'Copied to clipboard'))
          }}
          icon={<CopyOutlined />}
        >
          {t('common.copy', 'Copy JSON')}
        </Button>
      </Space>
    </Modal>
  )
}

SchemaPreview.displayName = 'SchemaPreview'
