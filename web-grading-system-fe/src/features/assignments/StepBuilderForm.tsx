import { useState } from 'react'
import { Form, Select, Space, Button, Segmented, Alert, Input, InputNumber, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import type { StepType } from '../../shared/types/assignment'
import { HttpStepForm } from './HttpStepForm'
import { DbStepForm } from './DbStepForm'
import { isGuidedType, reverseMapHttpConfig, reverseMapDbConfig } from './stepBuilder'
import type { StepDraft } from './stepConfig'

interface StepBuilderFormProps {
  step?: {
    id?: string
    name?: string
    stepType?: StepType
    config?: string
    expectedResult?: string | null
    weight?: number
    timeoutMs?: number | null
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

export function StepBuilderForm({
  step,
  onSave,
  onCancel,
  saving,
  disabled = false,
  availableVariables = [],
}: StepBuilderFormProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [stepType, setStepType] = useState<StepType>(step?.stepType ?? 'HTTP_REQUEST')
  const [mode, setMode] = useState<'guided' | 'advanced'>(step ? 'advanced' : 'guided')
  const guided = isGuidedType(stepType)

  const handleTypeChange = (value: StepType) => {
    setStepType(value)
    setMode(value === 'EXTRACT' || value === 'DELAY' ? 'advanced' : 'guided')
    form.resetFields()
  }

  const handleSave = async (body: Record<string, any>) => {
    const payload: StepDraft = {
      name: body.name,
      description: body.description || undefined,
      stepType,
      config: body.config,
      expectedResult: body.expectedResult === undefined ? undefined : body.expectedResult,
      weight: body.weight ?? 1,
      timeoutMs: body.timeoutMs ?? null,
      required: body.required ?? true,
    }
    await onSave(payload)
  }

  // Reverse-map stored JSON config into form values when switching to guided
  const configObj = step?.config ? (() => {
    try { return JSON.parse(step.config) } catch { return {} }
  })() : {}

  const isExtractOrDelay = stepType === 'EXTRACT' || stepType === 'DELAY'

  return (
    <Form form={form} layout="vertical" initialValues={step ? { ...step, configRaw: step.config, expectedRaw: step.expectedResult ?? undefined } : {}}>
      <Form.Item name="name" label={t('step.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label={t('step.description')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="stepType" label={t('step.type')} rules={[{ required: true }]}>
        <Select
          options={STEP_TYPES.map((value) => ({ value, label: t(`step.typeOptions.${value}`) }))}
          value={stepType}
          onChange={handleTypeChange}
        />
      </Form.Item>

      {guided && (
        <Form.Item label={t('step.mode')}>
          <Segmented
            options={[
              { value: 'guided', label: t('step.guided') },
              { value: 'advanced', label: t('step.advanced') },
            ]}
            value={mode}
            onChange={(value) => setMode(value as 'guided' | 'advanced')}
          />
        </Form.Item>
      )}

      {isExtractOrDelay && (
        <Alert type="warning" showIcon message={t('step.unsupportedStepWarn', { type: stepType })} style={{ marginBottom: 16 }} />
      )}

      {!guided || mode === 'advanced' ? (
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
      ) : null}

      {guided && mode === 'guided' && !isExtractOrDelay && (
        <>
          {stepType === 'HTTP_REQUEST' && (
            <HttpStepForm
              initialValues={reverseMapHttpConfig(configObj)}
              onSave={handleSave}
              saving={saving}
              availableVariables={availableVariables}
            />
          )}
          {(stepType === 'DB_QUERY' || stepType === 'DB_SCHEMA_CHECK' || stepType === 'DB_MIGRATION') && (
            <DbStepForm
              stepType={stepType}
              initialValues={reverseMapDbConfig(configObj)}
              onSave={handleSave}
              saving={saving}
            />
          )}
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
        <Button type="primary" disabled={disabled} onClick={async () => {
          try {
            await form.validateFields()
            const values = form.getFieldsValue()
            await handleSave(values)
          } catch {
            // validation error already shown by antd
          }
        }} loading={saving}>
          {t('common.save')}
        </Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  )
}
