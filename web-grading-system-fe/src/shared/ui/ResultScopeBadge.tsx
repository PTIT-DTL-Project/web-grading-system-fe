import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'

// Review: 2026-10-10 — scope badge distinguishing whole-assignment (FULL)
// runs from single-question (PLAN) runs. Unknown scope (field absent
// pre-backend-deploy) renders nothing rather than a mislabeled PLAN badge;
// missing names fall back to '—' instead of breaking layout.
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
  if (scope !== 'PLAN') {
    return null
  }
  return <Tag>{t('result.scopePlan', { name: planName ?? '—' })}</Tag>
}
