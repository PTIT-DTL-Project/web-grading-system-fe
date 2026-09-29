import { Empty, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * Route placeholder used until a feature phase lands (Phase 2 class list,
 * Phase 3 class detail, Phase 5 student screens).
 */
export function ComingSoon({ title }: { title?: string }) {
  const { t } = useTranslation()
  return (
    <>
      {title ? (
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {title}
        </Typography.Title>
      ) : null}
      <Empty description={t('common.comingSoon')} style={{ padding: '48px 0' }} />
    </>
  )
}
