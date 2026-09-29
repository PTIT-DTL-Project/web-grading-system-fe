import { App, Form, Input, Modal } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createClass } from '../../shared/api/endpoints/classes'
import { useApiErrorMessage } from '../../shared/api/errors'

interface CreateClassFormValues {
  name: string
  semester: string
}

export function CreateClassModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const toMessage = useApiErrorMessage()
  const [form] = Form.useForm<CreateClassFormValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async (values: CreateClassFormValues) => {
    setSubmitting(true)
    try {
      await createClass({ name: values.name, semester: values.semester })
      message.success(t('classes.created'))
      form.resetFields()
      onClose()
      onCreated()
    } catch (error) {
      // 400 (duplicate / validation) and 409 (constraint) arrive with a fully
      // descriptive server message — keep the modal open so the input can be fixed
      // in place instead of losing what was typed.
      message.error(toMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('classes.createTitle')}
      okText={t('classes.create')}
      cancelText={t('common.cancel')}
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
    >
      <Form<CreateClassFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label={t('classes.name')}
          rules={[
            { required: true, whitespace: true, message: t('classes.nameRequired') },
            { max: 255, message: t('classes.nameMax') },
          ]}
        >
          <Input placeholder={t('classes.namePlaceholder')} autoFocus />
        </Form.Item>

        <Form.Item
          name="semester"
          label={t('classes.semester')}
          rules={[
            { required: true, whitespace: true, message: t('classes.semesterRequired') },
            // semester VARCHAR(20): over-long values reach Postgres and come back as a
            // generic 409, so this client-side cap is load-bearing, not cosmetic.
            { max: 20, message: t('classes.semesterMax') },
          ]}
        >
          <Input placeholder={t('classes.semesterPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
