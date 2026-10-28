import { useState } from 'react'
import { Modal, Input, Button, Space, Typography, Alert, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { InboxOutlined } from '@ant-design/icons'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (steps: Array<{ name: string; stepType: string; config: Record<string, unknown> }>) => void
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const { t } = useTranslation()
  const [rawText, setRawText] = useState('')
  const [preview, setPreview] = useState<Array<{ name: string; stepType: string; config: Record<string, unknown> }>>(
    []
  )

  const parsePostman = (raw: string): Array<{ name: string; stepType: string; config: Record<string, unknown> }> => {
    try {
      const data = JSON.parse(raw)
      if (!data || !data.item || !Array.isArray(data.item)) {
        throw new Error('Not a valid Postman Collection: missing item[] array')
      }
      return data.item.map((item: any, idx: number) => {
        const req = item.request || {}
        const method = req.method || 'GET'
        const urlRaw = req.url?.raw || req.url?.path || ''
        const path = urlRaw.replace(/^https?:\/\/[^/]+/, '') || '/'
        const headers: Record<string, string> = {}
        ;(req.header || []).forEach((h: any) => {
          if (h.key && h.value !== undefined) headers[h.key] = h.value
        })
        const bodyRaw = req.body?.raw
        const config: Record<string, unknown> = {
          method,
          path,
          expected_status: 200,
        }
        if (Object.keys(headers).length) config.headers = headers
        if (bodyRaw) config.body = bodyRaw
        return {
          name: item.name || `Step ${idx + 1}`,
          stepType: 'HTTP_REQUEST',
          config,
        }
      })
    } catch (e) {
      throw new Error(`Failed to parse Postman Collection: ${(e as Error).message}`)
    }
  }

  const parseOpenAPI = (raw: string): Array<{ name: string; stepType: string; config: Record<string, unknown> }> => {
    try {
      const data = JSON.parse(raw)
      if (!data || !data.paths || typeof data.paths !== 'object') {
        throw new Error('Not a valid OpenAPI Spec: missing paths object')
      }
      const steps: Array<{ name: string; stepType: string; config: Record<string, unknown> }> = []
      for (const [path, methods] of Object.entries(data.paths)) {
        if (!methods || typeof methods !== 'object') continue
        for (const [method, details] of Object.entries(methods)) {
          if (!details || typeof details !== 'object') continue
          const summary = details.summary || `${method.toUpperCase()} ${path}`
          const config: Record<string, unknown> = {
            method: method.toUpperCase(),
            path,
            expected_status: 200,
          }
          if (details.parameters && Array.isArray(details.parameters)) {
            const headers: Record<string, string> = {}
            const queryParams: Record<string, string> = {}
            details.parameters.forEach((p: any) => {
              if (p.in === 'header' && p.name) headers[p.name] = p.example?.toString() || ''
              if (p.in === 'query' && p.name) queryParams[p.name] = p.example?.toString() || ''
            })
            if (Object.keys(headers).length) config.headers = headers
            if (Object.keys(queryParams).length) config.query_params = queryParams
          }
          if (details.requestBody?.content?.['application/json']?.example) {
            config.body = details.requestBody.content['application/json'].example
          }
          steps.push({
            name: summary,
            stepType: 'HTTP_REQUEST',
            config,
          })
        }
      }
      if (steps.length === 0) {
        throw new Error('No endpoints found in OpenAPI Spec')
      }
      return steps
    } catch (e) {
      throw new Error(`Failed to parse OpenAPI Spec: ${(e as Error).message}`)
    }
  }

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value)
    setPreview([])
  }

  const handleImport = () => {
    const text = rawText.trim()
    if (!text) {
      message.warning(t('importInvalidFile') || 'Please paste JSON content')
      return
    }
    try {
      const parsed = JSON.parse(text)
      let steps: Array<{ name: string; stepType: string; config: Record<string, unknown> }>
      if (parsed.paths && typeof parsed.paths === 'object') {
        steps = parseOpenAPI(text)
      } else if (parsed.item && Array.isArray(parsed.item)) {
        steps = parsePostman(text)
      } else {
        throw new Error('Unrecognized format: not a Postman Collection or OpenAPI Spec')
      }
      setPreview(steps)
    } catch (e) {
      message.error((e as Error).message || 'Import failed')
    }
  }

  const handleConfirm = () => {
    if (preview.length > 0) {
      onImport(preview)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      title={t('importTitle') || 'Import Postman / OpenAPI'}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={t('common.import') || 'Import'}
      cancelText={t('common.cancel')}
      width={720}
    >
      <Typography.Text>{t('importPlaceholder') || 'Paste JSON collection or spec here'}</Typography.Text>
      <div style={{ marginTop: 8 }}>
        <Input.TextArea
          rows={10}
          value={rawText}
          onChange={handlePaste}
          placeholder={t('importPlaceholder') || 'Paste JSON collection or spec here'}
          allowClear
        />
      </div>
      {preview.length > 0 && (
        <Alert
          type="info"
          message={t('importPreview', { count: preview.length }) || `{{count}} steps generated`}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      <Space style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleImport}>
          <InboxOutlined /> Parse & Preview
        </Button>
      </Space>
    </Modal>
  )
}

ImportModal.displayName = 'ImportModal'
