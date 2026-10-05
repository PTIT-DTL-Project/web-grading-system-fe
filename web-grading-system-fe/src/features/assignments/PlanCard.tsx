import { useState } from 'react'
import { App, Space, Typography, Tag, Button, Popconfirm } from 'antd'
import { useTranslation } from 'react-i18next'
import type { TestPlan } from '../../shared/types/assignment'
import { StepEditor } from './StepEditor'
import { useTestSteps } from './useTestSteps'
import { useApiErrorMessage } from '../../shared/api/errors'
import { colors } from '../../shared/theme/tokens'
import type { StepType } from '../../shared/types/assignment'

interface PlanCardProps {
  plan: TestPlan
  assignmentId: string
  archived?: boolean
  onDelete: (planId: string) => void
}

export function PlanCard({ plan, assignmentId, archived = false, onDelete }: PlanCardProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const toMessage = useApiErrorMessage()
  const [expanded, setExpanded] = useState(false)
  const [stepEditorOpen, setStepEditorOpen] = useState(false)
  const [savingStep, setSavingStep] = useState(false)
  const { steps, loading: stepsLoading, create } = useTestSteps(assignmentId, plan.id, expanded)

  // Review: 2026-10-05, Pullfrog — the Save button must track the actual create request and close only on success.
  const handleCreateStep = async (body: { name: string; stepType: StepType; config?: string; expectedResult?: string; weight?: number; timeoutMs?: number; required?: boolean }) => {
    setSavingStep(true)
    try {
      await create(body)
      setStepEditorOpen(false)
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setSavingStep(false)
    }
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Typography.Text strong>{plan.name}</Typography.Text>
          <Tag>#{plan.sequenceOrder}</Tag>
          <Tag>{t('step.weight')}: {plan.weight}</Tag>
        </Space>
        <Space size={8}>
          <Button type="link" size="small" disabled={archived} onClick={() => setStepEditorOpen(true)}>
            {t('step.create')}
          </Button>
          <Popconfirm title={t('common.delete')} onConfirm={() => onDelete(plan.id)}>
            <Button type="link" danger size="small" disabled={archived}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      </div>
      {plan.description && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{plan.description}</Typography.Text>
      )}

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {stepsLoading && <Typography.Text type="secondary">{t('common.loading')}</Typography.Text>}
          {!stepsLoading && steps.length === 0 && (
            <Typography.Text type="secondary">{t('step.empty')}</Typography.Text>
          )}
          {steps.map((step) => (
            <div key={step.id} style={{ padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
              <Space>
                <Tag>{step.stepType}</Tag>
                <Typography.Text>{step.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('step.weight')}: {step.weight}</Typography.Text>
              </Space>
            </div>
          ))}
        </div>
      )}

      <Button type="link" size="small" onClick={() => setExpanded(!expanded)}>
        {expanded ? t('common.collapse') : t('common.expand')}
      </Button>

      {stepEditorOpen && (
        <StepEditor
          onSave={handleCreateStep}
          onCancel={() => setStepEditorOpen(false)}
          saving={savingStep}
          disabled={archived}
        />
      )}
    </div>
  )
}
