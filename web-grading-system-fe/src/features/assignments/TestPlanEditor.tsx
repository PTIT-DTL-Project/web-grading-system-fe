import { Space, Typography, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { useTestPlans } from './useTestPlans'
import { PlanCard } from './PlanCard'
import { useApiErrorMessage } from '../../shared/api/errors'

interface TestPlanEditorProps {
  assignmentId: string
}

export function TestPlanEditor({ assignmentId }: TestPlanEditorProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { plans, loading, error, remove } = useTestPlans(assignmentId)

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

      {plans.length === 0 && (
        <Typography.Text type="secondary">{t('plan.empty')}</Typography.Text>
      )}
    </Space>
  )
}
