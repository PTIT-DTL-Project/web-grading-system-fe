import { Space, Typography, Spin, Button, Modal, Form, Input, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useTestPlans } from './useTestPlans'
import { PlanCard } from './PlanCard'
import { useApiErrorMessage } from '../../shared/api/errors'
import { useState } from 'react'

interface TestPlanEditorProps {
  assignmentId: string
}

export function TestPlanEditor({ assignmentId }: TestPlanEditorProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { plans, loading, error, remove, create } = useTestPlans(assignmentId)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

  const handleCreate = async (values: { name: string; description?: string }) => {
    setCreating(true)
    try {
      await create(values)
      form.resetFields()
      setModalOpen(false)
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Typography.Text type="secondary">{toMessage(error) as string}</Typography.Text>
      </div>
    )
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          assignmentId={assignmentId}
          onDelete={(planId) => remove(planId)}
        />
      ))}

      <Button type="primary" size="small" onClick={() => setModalOpen(true)}>
        {t('plan.create')}
      </Button>

      <Modal
        open={modalOpen}
        title={t('plan.create')}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="name" label={t('plan.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('assignment.description')}>
            <Input.TextArea />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}