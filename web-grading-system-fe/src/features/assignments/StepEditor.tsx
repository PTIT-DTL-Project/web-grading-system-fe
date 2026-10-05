import { Form, Input, Select, InputNumber, Switch, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import type { StepType } from '../../shared/types/assignment'

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
  onSave: (body: { name: string; stepType: StepType; config?: string; expectedResult?: string; weight?: number; timeoutMs?: number; required?: boolean }) => Promise<unknown>
  onCancel: () => void
  saving: boolean
  disabled?: boolean
}

const STEP_TYPES: StepType[] = [
  'HTTP_REQUEST',
  'DB_QUERY',
  'DB_SCHEMA_CHECK',
  'DB_MIGRATION',
  'EXTRACT',
  'DELAY',
]

export function StepEditor({ step, onSave, onCancel, saving, disabled = false }: StepEditorProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const stepType = Form.useWatch('stepType', form) as StepType | undefined
  const stepTypeOptions = STEP_TYPES.map((value) => ({
    value,
    label: t(`step.typeOptions.${value}`),
  }))

  // Review: 2026-10-05, Pullfrog — PlanCard owns success, failure, and closing, so do not reset here and discard editor state.
  const handleOk = async () => {
    const values = await form.validateFields()
    await onSave({
      name: values.name,
      stepType: values.stepType,
      config: values.config || undefined,
      expectedResult: values.expectedResult || undefined,
      weight: values.weight ?? 1,
      timeoutMs: values.timeoutMs ?? null,
      required: values.required ?? true,
    })
  }

  return (
    <Form form={form} layout="vertical" initialValues={step}>
      <Form.Item name="name" label={t('step.name')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
        <Form.Item name="stepType" label={t('step.type')} rules={[{ required: true }]}>
          <Select options={stepTypeOptions} />
        </Form.Item>
      {(stepType === 'HTTP_REQUEST' || stepType === 'DB_QUERY' || stepType === 'DB_MIGRATION') && (
        <Form.Item name="config" label={t('step.config')}>
          <Input.TextArea rows={4} placeholder={t('step.configPlaceholder')} />
        </Form.Item>
      )}
        <Form.Item name="expectedResult" label={t('step.expectedResult')}>
          <Input.TextArea rows={3} placeholder={t('step.expectedResultPlaceholder')} />
      </Form.Item>
      <Form.Item name="weight" label={t('step.weight')} initialValue={1}>
        <InputNumber min={1} />
      </Form.Item>
        <Form.Item name="timeoutMs" label={t('step.timeout')} initialValue={null}>
          <InputNumber min={0} placeholder={t('step.timeoutPlaceholder')} />
      </Form.Item>
      <Form.Item name="required" label={t('step.required')} valuePropName="checked" initialValue={true}>
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
