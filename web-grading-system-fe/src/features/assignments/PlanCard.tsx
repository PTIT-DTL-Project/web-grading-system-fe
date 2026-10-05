import { useMemo, useState } from 'react'
import { App, Space, Typography, Tag, Button, Popconfirm } from 'antd'
import { useTranslation } from 'react-i18next'
import type { TestPlan } from '../../shared/types/assignment'
import { StepEditor } from './StepEditor'
import type { StepDraft } from './stepConfig'
import { SYSTEM_VARIABLES } from './stepConfig'
import { useTestSteps } from './useTestSteps'
import { useApiErrorMessage } from '../../shared/api/errors'
import { colors } from '../../shared/theme/tokens'

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
  const { steps, loading: stepsLoading, create } = useTestSteps(assignmentId, plan.id, expanded || stepEditorOpen)

  // Review: 2026-10-05 — variable names come from earlier steps' extract blocks plus system variables.
  const availableVariables = useMemo(() => {
    const names = new Set<string>(SYSTEM_VARIABLES)
    steps.forEach((step) => {
      try {
        const config = JSON.parse(step.config) as { extract?: { name?: string }[] }
        ;(config.extract ?? []).forEach((entry) => {
          if (entry?.name) names.add(entry.name)
        })
      } catch {
        // Unparseable configs simply contribute no variable names.
      }
    })
    return [...names]
  }, [steps])

  // Review: 2026-10-05 — CreateStepRequest requires stepOrder; auto-assign next order instead of omitting it.
  const handleCreateStep = async (body: StepDraft) => {
    if (stepsLoading) {
      message.warning(t('common.loading'))
      return
    }
    const stepOrder = steps.length ? Math.max(...steps.map((step) => step.stepOrder)) + 1 : 0
    setSavingStep(true)
    try {
      await create({ ...body, stepOrder })
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
          availableVariables={availableVariables}
        />
      )}
    </div>
  )
}
