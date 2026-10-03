import { App, Form, Input, Modal } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changePassword } from '../../shared/api/endpoints/account'
import { isApiError, useApiErrorMessage } from '../../shared/api/errors'
import { getSession } from '../../shared/auth/keycloak'
import { newPasswordRules } from './passwordRules'

interface ChangePasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const toMessage = useApiErrorMessage()
  const [form] = Form.useForm<ChangePasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async (values: ChangePasswordFormValues) => {
    // Username comes from the session, never from user input — a voluntary change
    // must target the signed-in account only. Review: 2026-10-03, Phase 1 plan
    const session = getSession()
    if (!session || !session.email) {
      message.error(t('errors.unknown'))
      return
    }
    setSubmitting(true)
    try {
      await changePassword({
        username: session.email,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      message.success(t('auth.changePasswordSuccess'))
      form.resetFields()
      onClose()
      // Unlike the forced flow, the user stays logged in: their session tokens
      // are untouched by a voluntary password change. Review: 2026-10-03, Phase 1 plan
    } catch (error) {
      if (isApiError(error) && error.message === 'current_password_invalid') {
        message.error(t('auth.currentPasswordWrong'))
      } else {
        message.error(toMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Drop typed passwords from form state whenever the modal is dismissed.
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('auth.changePasswordTitle')}
      okText={t('auth.changePassword')}
      cancelText={t('common.cancel')}
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={handleCancel}
    >
      <Form<ChangePasswordFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item
          name="currentPassword"
          label={t('auth.currentPassword')}
          rules={[{ required: true, whitespace: true, message: t('auth.invalidField') }]}
        >
          <Input.Password placeholder={t('auth.currentPasswordPlaceholder')} autoFocus />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={t('auth.newPassword')}
          rules={newPasswordRules(t)}
        >
          <Input.Password placeholder={t('auth.newPasswordPlaceholder')} />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t('auth.confirmPassword')}
          dependencies={['newPassword']}
          rules={[
            { required: true, whitespace: true, message: t('auth.invalidField') },
            ({ getFieldValue }) => ({
              validator(_, value: string) {
                if (!value || value === getFieldValue('newPassword')) return Promise.resolve()
                return Promise.reject(new Error(t('auth.passwordMismatch')))
              },
            }),
          ]}
        >
          <Input.Password placeholder={t('auth.confirmPasswordPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
