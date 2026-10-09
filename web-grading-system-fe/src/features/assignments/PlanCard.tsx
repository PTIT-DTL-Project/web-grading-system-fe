import { useMemo, useState } from 'react'
import { App, Space, Typography, Tag, Button, Popconfirm } from 'antd'
import { useTranslation } from 'react-i18next'
import type { TestPlan, TestStep } from '../../shared/types/assignment'
import { StepEditor } from './StepEditor'
import type { StepDraft } from './stepConfig'
import { SYSTEM_VARIABLES } from './stepConfig'
import { useTestSteps } from './useTestSteps'
import { useApiErrorMessage } from '../../shared/api/errors'
import { colors } from '../../shared/theme/tokens'
import { StepDetailView } from '../../shared/ui/StepDetailView'
import { normalizeLecturerStep } from '../../shared/ui/stepDetail'

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
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)
  const [stepEditorOpen, setStepEditorOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<TestStep | null>(null)
  const [savingStep, setSavingStep] = useState(false)
  const {
    steps,
    loading: stepsLoading,
    error: stepsError,
    create,
    update,
    remove,
  } = useTestSteps(assignmentId, plan.id, expanded || stepEditorOpen)

  // Review: 2026-10-05 — variable names come from extract blocks plus system
  // variables; while editing, only steps running earlier can supply variables.
  const stepExtractVars = useMemo(() => {
    const vars: { name: string; order: number }[] = []
    steps.forEach((step) => {
      try {
        const config = JSON.parse(step.config) as { extract?: { name?: string }[] }
        ;(config.extract ?? []).forEach((entry) => {
          if (entry?.name) vars.push({ name: entry.name, order: step.stepOrder })
        })
      } catch {
        // Unparseable configs simply contribute no variable names.
      }
    })
    return vars
  }, [steps])

  const editorVariables = useMemo(() => {
    const names = new Set<string>(SYSTEM_VARIABLES)
    stepExtractVars.forEach((entry) => {
      if (!editingStep || entry.order < editingStep.stepOrder) names.add(entry.name)
    })
    return [...names]
  }, [stepExtractVars, editingStep])

  // Review: 2026-10-05 — CreateStepRequest requires stepOrder; auto-assign next order instead of omitting it.
  const handleCreateStep = async (body: StepDraft) => {
    // Review: 2026-10-05, Pullfrog — a failed list leaves steps empty, so block
    // create instead of computing a colliding order 0.
    if (stepsError) {
      message.error(toMessage(stepsError))
      return
    }
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

  // Review: 2026-10-05, Pullfrog — steps were create-only with no way to fix a
  // mistyped path or type; edit reuses the advanced JSON editor prefilled from
  // the stored step. UpdateStepRequest still requires `name`, so it is always sent.
  const handleUpdateStep = async (body: StepDraft) => {
    if (!editingStep) return
    setSavingStep(true)
    try {
      await update(editingStep.id, { ...body, stepOrder: editingStep.stepOrder })
      setEditingStep(null)
      setStepEditorOpen(false)
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setSavingStep(false)
    }
  }

  const handleDeleteStep = async (id: string) => {
    try {
      await remove(id)
    } catch (err: unknown) {
      message.error(toMessage(err))
    }
  }

  const openCreate = () => {
    setEditingStep(null)
    setExpanded(true)
    setStepEditorOpen(true)
  }

  const openEdit = (step: TestStep) => {
    setEditingStep(step)
    setExpanded(true)
    setStepEditorOpen(true)
  }

  const closeEditor = () => {
    setEditingStep(null)
    setStepEditorOpen(false)
  }

  const hasStepsError = Boolean(stepsError)

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: 16, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Typography.Text strong>{plan.name}</Typography.Text>
          <Tag>#{plan.sequenceOrder}</Tag>
          <Tag>{t('step.weight')}: {plan.weight}</Tag>
        </Space>
        <Space size={8}>
          <Button type="link" size="small" disabled={archived} onClick={openCreate}>
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
          {hasStepsError && (
            <Typography.Text type="danger">{toMessage(stepsError)}</Typography.Text>
          )}
          {!hasStepsError && stepsLoading && (
            <Typography.Text type="secondary">{t('common.loading')}</Typography.Text>
          )}
          {!hasStepsError && !stepsLoading && steps.length === 0 && (
            <Typography.Text type="secondary">{t('step.empty')}</Typography.Text>
          )}
          {steps.map((step) => (
            <div key={step.id} style={{ padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
              <Space>
                <Tag>{step.stepType}</Tag>
                <Typography.Text>{step.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('step.weight')}: {step.weight}</Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setExpandedStepId((current) => (current === step.id ? null : step.id))}
                >
                  {expandedStepId === step.id ? t('common.collapse') : t('common.expand')}
                </Button>
                <Button type="link" size="small" disabled={archived} onClick={() => openEdit(step)}>
                  {t('common.edit')}
                </Button>
                <Popconfirm title={t('common.delete')} onConfirm={() => handleDeleteStep(step.id)}>
                  <Button type="link" danger size="small" disabled={archived}>
                    {t('common.delete')}
                  </Button>
                </Popconfirm>
              </Space>
              {expandedStepId === step.id && (
                <div style={{ marginTop: 8 }}>
                  <StepDetailView model={normalizeLecturerStep(step)} variant="full" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button type="link" size="small" onClick={() => setExpanded(!expanded)}>
        {expanded ? t('common.collapse') : t('common.expand')}
      </Button>

      {stepEditorOpen && (
        <StepEditor
          step={editingStep ?? undefined}
          onSave={editingStep ? handleUpdateStep : handleCreateStep}
          onCancel={closeEditor}
          saving={savingStep}
          disabled={archived}
          availableVariables={editorVariables}
        />
      )}
    </div>
  )
}
