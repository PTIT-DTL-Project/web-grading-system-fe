import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'

// Review: 2026-10-10 — scope badge distinguishing whole-assignment (FULL)
// runs from single-question (PLAN) runs. Unknown/legacy scope renders as a
// question badge; missing names fall back to '—' instead of breaking layout.
export function ResultScopeBadge({
  scope,
  planName,
}: {
  scope: 'FULL' | 'PLAN' | string | null | undefined
  planName?: string | null
}) {
  const { t } = useTranslation()
  if (scope === 'FULL') {
    return <Tag color="blue">{t('result.scopeFull')}</Tag>
  }
  return <Tag>{t('result.scopePlan', { name: planName ?? '—' })}</Tag>
}
