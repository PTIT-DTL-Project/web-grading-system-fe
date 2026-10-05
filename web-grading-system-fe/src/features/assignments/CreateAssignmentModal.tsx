import { Modal, Form, Input, Select, InputNumber } from 'antd'
import { useTranslation } from 'react-i18next'
import type { GradingStrategy, CreateAssignmentRequest } from '../../shared/types/assignment'

interface CreateAssignmentModalProps {
  open: boolean
  classId: string
  ownerId: string
  onCreated: () => void
  onCancel: () => void
  creating: boolean
  createFn: (req: CreateAssignmentRequest) => Promise<unknown>
}

export function CreateAssignmentModal({
  open,
  classId,
  ownerId,
  onCreated,
  onCancel,
  creating,
  createFn,
}: CreateAssignmentModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const strategy = Form.useWatch('gradingStrategy', form) as GradingStrategy | undefined

  // Review: 2026-10-05, Pullfrog — only clear and close after backend success so validation failures preserve user input.
  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      await createFn({
        classId,
        ownerId,
        title: values.title,
        description: values.description || undefined,
        gradingStrategy: values.gradingStrategy,
        dockerComposeTemplate: values.dockerComposeTemplate || undefined,
        dockerComposePort: values.dockerComposePort ?? 8080,
        startupTimeoutMs: values.startupTimeoutMs || 60000,
        executionTimeoutMs: values.executionTimeoutMs || 300000,
        maxMemoryMb: values.maxMemoryMb || 256,
        maxCpu: values.maxCpu || 0.5,
      })
    } catch {
      // AssignmentTab already shows the backend error; keep the modal open with its values.
      return
    }
    form.resetFields()
    onCreated()
  }

  return (
    <Modal
      open={open}
      title={t('assignment.create')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={creating}
      width={600}
    >
      <Form form={form} layout="vertical">
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
        {strategy === 'LECTURER_DOCKER_COMPOSE' && (
          <Form.Item name="dockerComposeTemplate" label={t('assignment.form.dockerComposeTemplate')} rules={[{ required: true }]} preserve={false}>
            <Input.TextArea rows={4} />
          </Form.Item>
        )}
        <Form.Item name="dockerComposePort" label={t('assignment.form.dockerComposePort')} initialValue={8080}>
          <InputNumber min={1} max={65535} />
        </Form.Item>
        <Form.Item name="startupTimeoutMs" label={t('assignment.form.startupTimeout')} initialValue={60000}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="executionTimeoutMs" label={t('assignment.form.executionTimeout')} initialValue={300000}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="maxMemoryMb" label={t('assignment.form.maxMemory')} initialValue={256}>
          <InputNumber />
        </Form.Item>
        <Form.Item name="maxCpu" label={t('assignment.form.maxCpu')} initialValue={0.5}>
          <InputNumber step={0.1} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
