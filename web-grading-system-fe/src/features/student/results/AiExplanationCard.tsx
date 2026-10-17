import { App, Alert, Button, Card, List, Skeleton, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined, RobotOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAiExplanation } from './useAiExplanation'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { formatDateTime } from '../../../shared/format/formatDateTime'
import { colors } from '../../../shared/theme/tokens'
import type { StepAnalysis } from '../../../shared/types/aiExplanation'

function StepAnalysisRow({ step }: { step: StepAnalysis }) {
  const { t } = useTranslation()
  // The LLM may omit either list; map over `[]`, never a null (mirrors the BE
  // NPE fix at AiExplanationService: a null list must not reach a mapper).
  const hints = step.actionableHints ?? []
  const keywords = step.learningKeywords ?? []

  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      <Space size={8} align="center" wrap>
        {step.passed ? (
          <CheckCircleOutlined style={{ color: colors.success, fontSize: 16 }} />
        ) : (
          <CloseCircleOutlined style={{ color: colors.error, fontSize: 16 }} />
        )}
        <Typography.Text strong>{step.stepName ?? '—'}</Typography.Text>
        {step.stepType ? <Tag>{step.stepType}</Tag> : null}
      </Space>
      {step.diagnosis ? (
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {step.diagnosis}
        </Typography.Paragraph>
      ) : null}
      {step.suspectedLocation ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('ai.suspectedLocation')}: {step.suspectedLocation}
        </Typography.Text>
      ) : null}
      {hints.length > 0 ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('ai.hints')}
          </Typography.Text>
          <div style={{ marginTop: 4 }}>
            <Space size={[4, 4]} wrap>
              {hints.map((hint, index) => (
                <Tag key={index} color={colors.info}>
                  {hint}
                </Tag>
              ))}
            </Space>
          </div>
        </div>
      ) : null}
      {keywords.length > 0 ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('ai.keywords')}
          </Typography.Text>
          <div style={{ marginTop: 4 }}>
            <Space size={[4, 4]} wrap>
              {keywords.map((keyword, index) => (
                <Tag key={index}>{keyword}</Tag>
              ))}
            </Space>
          </div>
        </div>
      ) : null}
    </Space>
  )
}

interface AiExplanationCardProps {
  submissionId: string
  /** False until the result page has grading rows — the POST 404s without them. */
  enabled: boolean
}

/**
 * AI explanation panel for one submission.
 *
 * GET on mount (cache hit renders instantly); the LLM POST runs only when the
 * student clicks Tạo giải thích AI, so scrolling results never triggers a paid
 * multi-second call. Placed on SubmissionResultPage below the score.
 */
export function AiExplanationCard({ submissionId, enabled }: AiExplanationCardProps) {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const toMessage = useApiErrorMessage()
  const { explanation, loading, error, generating, generate, retry } = useAiExplanation(
    submissionId,
    enabled,
  )

  if (!enabled) return null

  const handleGenerate = () => {
    generate().catch((err: unknown) => {
      // Keep the CTA on screen: a 502 (result-service down) or a network blip is
      // retryable, so surface the mapped message and let the student click again.
      message.error(toMessage(err))
    })
  }

  const hasError = Boolean(error)

  return (
    <Card
      title={
        <Space size={8}>
          <RobotOutlined style={{ color: colors.primary }} />
          <span>{t('ai.title')}</span>
          {explanation?.fromCache ? (
            <Tag icon={<HistoryOutlined />}>{t('ai.fromCache')}</Tag>
          ) : null}
        </Space>
      }
      style={{ borderColor: colors.border }}
    >
      {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : null}

      {!loading && hasError ? (
        <Alert
          type="error"
          title={t('ai.loadFailed')}
          description={toMessage(error)}
          action={
            <Button size="small" onClick={retry}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}

      {!loading && !hasError && explanation === null ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">{t('ai.notGeneratedHint')}</Typography.Text>
          <div>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={generating}
              onClick={handleGenerate}
            >
              {generating ? t('ai.generating') : t('ai.generate')}
            </Button>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ai.generatingHint')}
          </Typography.Text>
        </Space>
      ) : null}

      {!loading && !hasError && explanation ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {explanation.overallSummary ? (
            <div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {t('ai.summary')}
              </Typography.Title>
              <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {explanation.overallSummary}
              </Typography.Paragraph>
            </div>
          ) : null}

          <div>
            <Typography.Title level={5}>{t('ai.stepAnalyses')}</Typography.Title>
            {explanation.stepAnalyses.length > 0 ? (
              <List
                size="small"
                dataSource={explanation.stepAnalyses}
                renderItem={(step, index) => (
                  <List.Item key={step.stepId ?? index}>
                    <StepAnalysisRow step={step} />
                  </List.Item>
                )}
              />
            ) : (
              <Typography.Text type="secondary">{t('ai.noSteps')}</Typography.Text>
            )}
          </div>

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ai.generatedAt', {
              time: formatDateTime(explanation.createdAt, i18n.language),
            })}
          </Typography.Text>
        </Space>
      ) : null}
    </Card>
  )
}
