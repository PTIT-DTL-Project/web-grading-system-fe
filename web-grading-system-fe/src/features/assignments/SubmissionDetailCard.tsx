import { useState, type Key } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Col,
  Result,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Alert,
} from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { useSubmissionResult } from '../student/results/useSubmissionResult'
import { AiExplanationCard } from '../../shared/ui/AiExplanationCard'
import { ResultScopeBadge } from '../../shared/ui/ResultScopeBadge'
import { useQuery } from '@tanstack/react-query'
import { getAssignment, listPlans } from '../../shared/api/endpoints/assignments'
import { useApiErrorMessage } from '../../shared/api/errors'
import { colors } from '../../shared/theme/tokens'
import type { ResultResponse, StepResultResponse } from '../../shared/types/result'

interface AssertionDetail {
  kind?: string
  expected?: string | number | boolean | null
  actual?: string | number | boolean | null
  passed?: boolean
  message?: string
}

function parseAssertions(raw: string | null): AssertionDetail[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter(
      (e): e is AssertionDetail => !!e && typeof e === 'object' && !Array.isArray(e),
    )
  } catch {
    return null
  }
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function StepEvidence({ step }: { step: StepResultResponse }) {
  const { t } = useTranslation()
  const assertions = parseAssertions(step.assertionDetails)
  const shownAssertions = assertions ? assertions.slice(0, 20) : null
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      {step.actualValue ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.actualValue')}
          </Typography.Text>
          <Typography.Paragraph
            code
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {step.actualValue}
          </Typography.Paragraph>
        </div>
      ) : null}
      {step.expectedValue ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.expectedValue')}
          </Typography.Text>
          <Typography.Paragraph
            code
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {step.expectedValue}
          </Typography.Paragraph>
        </div>
      ) : null}
      {step.errorMessage ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.errorMessage')}
          </Typography.Text>
          <Typography.Paragraph
            type="danger"
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {step.errorMessage}
          </Typography.Paragraph>
        </div>
      ) : null}
      {shownAssertions && shownAssertions.length > 0 ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.assertions')}
          </Typography.Text>
          <Table
            rowKey={(_, index) => String(index)}
            columns={[
              { title: t('result.assertionKind'), dataIndex: 'kind', key: 'kind', width: 130 },
              {
                title: t('result.expectedValue'),
                dataIndex: 'expected',
                key: 'expected',
                // Review: 2026-10-11, Pullfrog — body_equals/structure store
                // Gson JsonElements, which String() renders as [object Object].
                render: (v: unknown) =>
                  v === null || v === undefined
                    ? '—'
                    : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v),
              },
              {
                title: t('result.actualValue'),
                dataIndex: 'actual',
                key: 'actual',
                render: (v: unknown) =>
                  v === null || v === undefined
                    ? '—'
                    : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v),
              },
              {
                title: t('result.passed'),
                dataIndex: 'passed',
                key: 'passed',
                width: 70,
                render: (v: boolean) =>
                  v ? (
                    <CheckCircleOutlined style={{ color: colors.success, fontSize: 16 }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: colors.error, fontSize: 16 }} />
                  ),
              },
            ]}
            dataSource={shownAssertions}
            pagination={false}
            size="small"
            style={{ marginTop: 4 }}
          />
          {assertions && assertions.length > shownAssertions.length ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('result.andMore', { count: assertions.length - shownAssertions.length })}
            </Typography.Text>
          ) : null}
        </div>
      ) : null}
      {step.requestUrl || step.requestBody ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.request')}
          </Typography.Text>
          {step.requestUrl ? (
            <Typography.Paragraph
              code
              copyable
              style={{ fontSize: 12, margin: '4px 0 0' }}
            >
              {step.requestUrl}
            </Typography.Paragraph>
          ) : null}
          {step.requestBody ? (
            <Typography.Paragraph
              code
              copyable
              ellipsis={{ rows: 6, expandable: true, symbol: t('result.showMore') }}
              style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
            >
              {step.requestBody}
            </Typography.Paragraph>
          ) : null}
        </div>
      ) : null}
      {step.extractedVars ? (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            {t('result.extractVars')}
          </Typography.Text>
          <Typography.Paragraph
            code
            copyable
            style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}
          >
            {prettyJson(step.extractedVars)}
          </Typography.Paragraph>
        </div>
      ) : null}
    </Space>
  )
}

export interface SubmissionDetailCardProps {
  submissionId: string
  assignmentId?: string
  onBack?: () => void
  backLabelKey?: string
  /** Pre-resolved plan name resolver — avoids a student-only endpoint call from the lecturer context. */
  planName?: (planId: string | null) => string | null
  /** Pre-resolved assignment title — avoids a student-only endpoint call from the lecturer context. */
  title?: React.ReactNode
}

export function SubmissionDetailCard({
  submissionId,
  assignmentId,
  onBack,
  backLabelKey = 'result.backToSubmissions',
  planName: planNameProp,
  title: titleProp,
}: SubmissionDetailCardProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { results, loading, error, isReady, timedOut, retry } = useSubmissionResult(submissionId)
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([])
  const resolvedAssignmentId = assignmentId ?? results[0]?.assignmentId

  // Use injected (lecturer) resolver when provided; otherwise fetch via student endpoint.
  const { data: plans } = useQuery({
    queryKey: ['assignment-plans', resolvedAssignmentId],
    queryFn: () => listPlans(resolvedAssignmentId ?? ''),
    enabled: !!resolvedAssignmentId && !planNameProp,
    staleTime: 10 * 60 * 1000,
  })
  const resolvedPlanName = planNameProp ?? ((planId: string | null) => plans?.find((p) => p.id === planId)?.name ?? null)

  // For the student view (no title prop), fetch via lecturer-scoped endpoint;
  // for lecturer deep-link, AssignmentResultsPage passes title to avoid the call.
  const { data: assignment } = useQuery({
    queryKey: ['assignment', resolvedAssignmentId],
    queryFn: () => getAssignment(resolvedAssignmentId ?? ''),
    enabled: !!resolvedAssignmentId && !titleProp,
    staleTime: 10 * 60 * 1000,
  })
  const resolvedTitle = titleProp ?? assignment?.title ?? '—'

  if (loading && !isReady) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title={t('result.loadFailed')}
        subTitle={toMessage(error)}
        extra={
          onBack ? (
            <Button onClick={onBack}>{backLabelKey ? t(backLabelKey) : t('common.back')}</Button>
          ) : (
            <Button onClick={() => window.history.back()}>{t('common.back')}</Button>
          )
        }
      />
    )
  }

  if (timedOut && !isReady) {
    return (
      <Result
        status="warning"
        title={t('result.pollTimeout')}
        subTitle={t('result.pollTimeoutHint')}
        extra={
          <Space>
            <Button type="primary" onClick={retry}>
              {t('common.retry')}
            </Button>
            {onBack ? (
              <Button onClick={onBack}>{t(backLabelKey)}</Button>
            ) : (
              <Button onClick={() => window.history.back()}>{t('common.back')}</Button>
            )}
          </Space>
        }
      />
    )
  }

  if (!isReady) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Space direction="vertical" size={16}>
          <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 40 }} spin />} />
          <Typography.Title level={4}>{t('result.notReady')}</Typography.Title>
          <Typography.Text type="secondary">{t('result.notReadyHint')}</Typography.Text>
        </Space>
      </div>
    )
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const totalMax = results.reduce((sum, r) => sum + r.maxScore, 0)

  const stepColumns: TableColumnsType<StepResultResponse> = [
    { title: t('result.stepName'), dataIndex: 'stepName', key: 'stepName' },
    { title: t('result.stepType'), dataIndex: 'stepType', key: 'stepType', width: 120 },
    {
      title: t('result.passed'),
      dataIndex: 'passed',
      key: 'passed',
      width: 90,
      // Review: 2026-10-10 — skipped steps (cascaded after a required-step
      // failure) are neither pass nor fail; show them neutrally.
      render: (passed: boolean, r: StepResultResponse) => {
        if (r.skipped) {
          return <Tag>{t('result.skipped')}</Tag>
        }
        if (passed) {
          return <CheckCircleOutlined style={{ color: colors.success, fontSize: 18 }} />
        }
        return <CloseCircleOutlined style={{ color: colors.error, fontSize: 18 }} />
      },
    },
    {
      title: t('result.score'),
      key: 'score',
      width: 100,
      render: (_, r) => `${r.score}/${r.weight}`,
    },
    {
      title: t('result.durationMs'),
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 120,
      render: (v: number | null) => (v != null ? `${v} ms` : '—'),
    },
    {
      title: t('result.errorMessage'),
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (v: string | null) => {
        if (v) {
          return (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              {v}
            </Typography.Text>
          )
        }
        return '—'
      },
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
            {t(backLabelKey)}
          </Button>
        ) : null}
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('result.title')}
          </Typography.Title>
          {results[0] ? (
            <Typography.Text type="secondary">
              {resolvedTitle}
            </Typography.Text>
          ) : null}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card style={{ borderColor: colors.border, textAlign: 'center' }}>
            <Statistic
              title={t('result.totalScore', {
                score: totalScore.toFixed(2),
                max: totalMax.toFixed(2),
              })}
              value={totalScore.toFixed(2)}
              suffix={`/ ${totalMax.toFixed(2)}`}
              valueStyle={{
                // Review: 2026-10-09 — guard max 0 so an empty max score does
                // not render NaN-red via a false comparison.
                color: totalMax > 0 && totalScore / totalMax >= 0.5 ? colors.success : colors.error,
                fontSize: 32,
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
      </Row>

      <AiExplanationCard submissionId={submissionId} enabled={isReady} />

      {results.map((result: ResultResponse) => (
        <Card
          key={result.id}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{t('result.plan')}</span>
              <ResultScopeBadge scope={result.scope} planName={resolvedPlanName(result.planId)} />
              <Tag color={colors.info}>
                {t('assignments.planWeight', { weight: result.planWeight })}
              </Tag>
              <Tag color={result.score >= result.maxScore * 0.5 ? 'green' : 'red'}>
                {result.score.toFixed(2)} / {result.maxScore.toFixed(2)}
              </Tag>
            </div>
          }
          style={{ borderColor: colors.border }}
        >
          {result.summaryLog && (
            <Alert
              type="info"
              title={t('result.summaryLog')}
              description={
                <Typography.Text code style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {result.summaryLog}
                </Typography.Text>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          <Typography.Title level={5}>{t('result.steps')}</Typography.Title>
          <Table<StepResultResponse>
            rowKey="id"
            columns={stepColumns}
            dataSource={result.steps}
            pagination={false}
            size="small"
            expandable={{
              expandedRowRender: (step) => <StepEvidence step={step} />,
              rowExpandable: (step) =>
                !!(step.actualValue || step.expectedValue || step.errorMessage ||
                   step.assertionDetails || step.extractedVars || step.requestUrl ||
                   step.requestBody || step.responseStatus != null),
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys(keys.slice(-1)),
            }}
          />
        </Card>
      ))}
    </Space>
  )
}
