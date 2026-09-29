import { Result, Button } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * Error-first state: a failed load with nothing to show but the message + retry.
 * `title` is the generic headline for the screen; `message` is the specific reason
 * (backend text or an i18n'd transport failure). Without a `title` the reason stands
 * on its own as the headline.
 */
export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry: () => void
}) {
  const { t } = useTranslation()
  return (
    <Result
      status="error"
      title={title ?? message}
      subTitle={title ? message : undefined}
      extra={
        <Button type="primary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  )
}
