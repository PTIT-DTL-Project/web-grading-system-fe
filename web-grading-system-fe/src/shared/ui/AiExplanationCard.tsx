import { App, Alert, Button, Card, List, Skeleton, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, HistoryOutlined, RobotOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAiExplanation } from '../hooks/useAiExplanation'
import { useApiErrorMessage } from '../api/errors'
import { formatDateTime } from '../format/formatDateTime'
import { colors } from '../theme/tokens'
import type { StepAnalysis } from '../types/aiExplanation'

function GoogleIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      style={{ verticalAlign: -2 }}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

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
                <a
                  key={index}
                  href={`https://www.google.com/search?q=${encodeURIComponent(keyword)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Tag
                    icon={<GoogleIcon />}
                    color="purple"
                    style={{ cursor: 'pointer' }}
                    title={t('ai.searchGoogle', { keyword })}
                  >
                    {keyword}
                  </Tag>
                </a>
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
  /** False until the page has grading rows — the POST 404s without them. */
  enabled: boolean
  /**
   * Set by a lecturer viewing a submission inside one of their own assignments;
   * omitted for a student viewing their own. Selects the backend route (and with
   * it, the ownership rule the backend applies).
   */
  assignmentId?: string
}

const geminiWaveStyles = `
@keyframes geminiWave {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes geminiPulse {
  0%, 100% {
    transform: translateY(0);
    box-shadow: 0 4px 14px rgba(155, 114, 207, 0.4);
  }
  50% {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(66, 133, 244, 0.55);
  }
}

.gemini-btn-generating {
  background: linear-gradient(90deg, #4285f4, #9b72cf, #d96570, #4285f4) !important;
  background-size: 300% 100% !important;
  animation: geminiWave 3s ease infinite, geminiPulse 2s ease-in-out infinite !important;
  border: none !important;
  color: #ffffff !important;
  opacity: 1 !important;
}
.gemini-btn-generating:hover,
.gemini-btn-generating:focus,
.gemini-btn-generating:active {
  background: linear-gradient(90deg, #4285f4, #9b72cf, #d96570, #4285f4) !important;
  background-size: 300% 100% !important;
  color: #ffffff !important;
}
`

/**
 * AI explanation panel for one submission. Lives in `shared/` because both
 * audiences render it: a student on their result page, a lecturer on the
 * assignment results table.
 *
 * GET on mount (cache hit renders instantly); the LLM POST runs only when the
 * viewer clicks Tạo giải thích AI, so scrolling results never triggers a paid
 * multi-second call.
 */
export function AiExplanationCard({ submissionId, enabled, assignmentId }: AiExplanationCardProps) {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const toMessage = useApiErrorMessage()
  const { explanation, loading, error, generating, generate, retry } = useAiExplanation(
    submissionId,
    enabled,
    assignmentId,
  )

  if (!enabled) return null

  const handleGenerate = () => {
    generate().catch((err: unknown) => {
      // Keep the CTA on screen: a 502 (result-service down) or a network blip is
      // retryable, so surface the mapped message and let the viewer click again.
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
          <style>{geminiWaveStyles}</style>
          <Typography.Text type="secondary">{t('ai.notGeneratedHint')}</Typography.Text>
          <div>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={generating}
              onClick={handleGenerate}
              className={generating ? 'gemini-btn-generating' : undefined}
            >
              {generating ? t('ai.generating') : t('ai.generate')}
            </Button>
          </div>
          <Typography.Text
            type="secondary"
            style={{
              fontSize: 12,
              color: generating ? '#722ed1' : undefined,
              fontWeight: generating ? 500 : 400,
              transition: 'all 0.3s ease',
            }}
          >
            {generating ? t('ai.generatingReassuring') : t('ai.generatingHint')}
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
