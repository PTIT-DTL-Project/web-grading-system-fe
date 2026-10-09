import { useState, useRef } from 'react'
import { Modal, Form, Select, Button, Alert, Typography } from 'antd'
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { requestUploadUrl, uploadZipToStorage } from '../../../shared/api/endpoints/submissions'
import type { PlanResponse } from '../../../shared/types/assignment'
import { colors } from '../../../shared/theme/tokens'

interface SubmitAssignmentModalProps {
  assignmentId: string
  plans: PlanResponse[]
  open: boolean
  onClose: () => void
  onSuccess: (submissionId: string) => void
}

type SubmitStep = 'idle' | 'uploading' | 'done' | 'error'

export function SubmitAssignmentModal({
  assignmentId,
  plans,
  open,
  onClose,
  onSuccess,
}: SubmitAssignmentModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<SubmitStep>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [doneSubmissionId, setDoneSubmissionId] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    form.resetFields()
    setFile(null)
    setStep('idle')
    setErrorMsg('')
    setDoneSubmissionId('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async () => {
    try {
      await form.validateFields()
    } catch {
      return
    }
    if (!file) {
      setErrorMsg(t('submitModal.fileRequired'))
      return
    }

    const planId: string | undefined = form.getFieldValue('planId')
    setStep('uploading')
    setErrorMsg('')
    try {
      const presigned = await requestUploadUrl(assignmentId, file.name, planId)
      await uploadZipToStorage(presigned.uploadUrl, file)
      setDoneSubmissionId(presigned.submissionId)
      setStep('done')
    } catch (err: unknown) {
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : t('submitModal.failed'))
    }
  }

  const isLoading = step === 'uploading'

  return (
    <Modal
      title={t('submitModal.title')}
      open={open}
      onCancel={handleClose}
      footer={
        step === 'done'
          ? [
              <Button key="close" onClick={handleClose}>
                {t('common.cancel')}
              </Button>,
              <Button
                key="result"
                type="primary"
                style={{ background: colors.primary, borderColor: colors.primary }}
                onClick={() => {
                  handleClose()
                  onSuccess(doneSubmissionId)
                }}
              >
                {t('submitModal.viewResult')}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>,
              <Button
                key="submit"
                type="primary"
                loading={isLoading}
                style={{ background: colors.primary, borderColor: colors.primary }}
                onClick={handleSubmit}
              >
                {isLoading ? t('submitModal.uploading') : t('submitModal.submit')}
              </Button>,
            ]
      }
      destroyOnHidden
    >
      {step === 'done' ? (
        <Alert
          type="success"
          title={t('submitModal.success')}
          description={t('submitModal.successHint')}
          showIcon
        />
      ) : (
        <Form form={form} layout="vertical">
          {plans.length > 0 && (
            // Review: 2026-10-09 — planId is optional contract-side (omitted =
            // grade all plans), so the select stays optional with an explicit
            // "all plans" default instead of a required rule.
            <Form.Item
              name="planId"
              label={t('submitModal.selectPlan')}
              initialValue=""
            >
              <Select placeholder={t('submitModal.selectPlanPlaceholder')} allowClear>
                <Select.Option value="">{t('submitModal.allPlans')}</Select.Option>
                {plans.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} — {t('assignments.planWeight', { weight: p.weight })}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item label={t('submitModal.uploadFile')} required>
            <div
              style={{
                border: `1px dashed ${colors.border}`,
                borderRadius: 8,
                padding: 24,
                textAlign: 'center',
                cursor: 'pointer',
                background: colors.layoutBg,
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {isLoading ? (
                <LoadingOutlined style={{ fontSize: 32, color: colors.primary }} />
              ) : (
                <InboxOutlined style={{ fontSize: 32, color: colors.primary }} />
              )}
              <Typography.Paragraph style={{ margin: '8px 0 0' }}>
                {file ? file.name : t('submitModal.uploadHint')}
              </Typography.Paragraph>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </Form.Item>
          {errorMsg && <Alert type="error" message={errorMsg} showIcon />}
        </Form>
      )}
    </Modal>
  )
}
