import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Result
      status="404"
      title={t('errors.pageNotFound')}
      subTitle={t('errors.pageNotFoundDesc')}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {t('errors.goHome')}
        </Button>
      }
    />
  )
}
