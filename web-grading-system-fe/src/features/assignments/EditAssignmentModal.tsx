import { Alert, Modal, Form, Input, Select, InputNumber } from 'antd'
import { useTranslation } from 'react-i18next'
import type {
  AssignmentResponse,
  GradingStrategy,
  UpdateAssignmentRequest,
} from '../../shared/types/assignment'

interface EditAssignmentModalProps {
  open: boolean
  record: AssignmentResponse | null
  onSaved: () => void
  onCancel: () => void
  saving: boolean
  saveFn: (req: UpdateAssignmentRequest) => Promise<unknown>
}

// Review: 2026-10-10 — mirrors CreateAssignmentModal minus classId (the
// backend rejects class changes with 400). Strategy is editable; a warning
// (not a block) notes that already-graded results keep the old strategy.
export function EditAssignmentModal({
  open,
  record,
  onSaved,
  onCancel,
  saving,
  saveFn,
}: EditAssignmentModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const strategy = Form.useWatch('gradingStrategy', form) as GradingStrategy | undefined
  const strategyChanged = record && strategy && strategy !== record.gradingStrategy

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      await saveFn({
        title: values.title,
        description: values.description || undefined,
        gradingStrategy: values.gradingStrategy,
        dockerComposeTemplate: values.dockerComposeTemplate || undefined,
        dockerComposePort: values.dockerComposePort ?? undefined,
        startupTimeoutMs: values.startupTimeoutMs ?? undefined,
        executionTimeoutMs: values.executionTimeoutMs ?? undefined,
        maxMemoryMb: values.maxMemoryMb ?? undefined,
        maxCpu: values.maxCpu ?? undefined,
      })
    } catch {
      // AssignmentTab already shows the backend error; keep the modal open with its values.
      return
    }
    onSaved()
  }

  return (
    <Modal
      open={open}
      title={t('assignment.edit')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          record
            ? {
                title: record.title,
                description: record.description ?? undefined,
                gradingStrategy: record.gradingStrategy ?? undefined,
                dockerComposeTemplate: record.dockerComposeTemplate ?? undefined,
                dockerComposePort: record.dockerComposePort ?? undefined,
                startupTimeoutMs: record.startupTimeoutMs ?? undefined,
                executionTimeoutMs: record.executionTimeoutMs ?? undefined,
                maxMemoryMb: record.maxMemoryMb ?? undefined,
                maxCpu: record.maxCpu ?? undefined,
              }
            : undefined
        }
      >
        <Form.Item name="title" label={t('assignment.form.title')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t('assignment.form.description')}>
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="gradingStrategy" label={t('assignment.form.strategy')} rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'STUDENT_DOCKER_COMPOSE', label: t('assignment.strategyStudent') },
              { value: 'LECTURER_DOCKER_COMPOSE', label: t('assignment.strategyLecturer') },
            ]}
          />
        </Form.Item>
        {strategyChanged && (
          <Alert
            type="warning"
            showIcon
            message={t('assignment.form.strategyChangeWarning')}
            style={{ marginBottom: 16 }}
          />
        )}
        {strategy === 'LECTURER_DOCKER_COMPOSE' && (
          <Form.Item name="dockerComposeTemplate" label={t('assignment.form.dockerComposeTemplate')} rules={[{ required: true }]} preserve={false}>
            <Input.TextArea rows={4} />
          </Form.Item>
        )}
        <Form.Item name="dockerComposePort" label={t('assignment.form.dockerComposePort')}>
          <InputNumber min={1} max={65535} />
        </Form.Item>
        <Form.Item name="startupTimeoutMs" label={t('assignment.form.startupTimeout')}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="executionTimeoutMs" label={t('assignment.form.executionTimeout')}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="maxMemoryMb" label={t('assignment.form.maxMemory')}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="maxCpu" label={t('assignment.form.maxCpu')}>
          <InputNumber step={0.1} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
