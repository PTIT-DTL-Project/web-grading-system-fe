import { useParams, useNavigate } from 'react-router'
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
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { useSubmissionResult } from './useSubmissionResult'
import { AssignmentTitle } from '../submissions/AssignmentTitle'
import { ResultScopeBadge } from '../../../shared/ui/ResultScopeBadge'
import { useQuery } from '@tanstack/react-query'
import { getAssignmentPlans } from '../../../shared/api/endpoints/studentAssignments'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import type { ResultResponse, StepResultResponse } from '../../../shared/types/result'

export function SubmissionResultPage() {
  const { t } = useTranslation()
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const { results, loading, error, isReady, timedOut, retry } = useSubmissionResult(submissionId ?? '')
  const assignmentId = results[0]?.assignmentId
  const { data: plans } = useQuery({
    queryKey: ['student-assignment-plans', assignmentId],
    queryFn: () => getAssignmentPlans(assignmentId ?? ''),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  })
  const planName = (planId: string | null) => plans?.find((p) => p.id === planId)?.name ?? null

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
          <Button onClick={() => navigate('/student/submissions')}>
            {t('result.backToSubmissions')}
          </Button>
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
            <Button onClick={() => navigate('/student/submissions')}>
              {t('result.backToSubmissions')}
            </Button>
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
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/student/submissions')}
        >
          {t('result.backToSubmissions')}
        </Button>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t('result.title')}
          </Typography.Title>
          {results[0] ? (
            <Typography.Text type="secondary">
              <AssignmentTitle assignmentId={results[0].assignmentId} />
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

      {results.map((result: ResultResponse) => (
        <Card
          key={result.id}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{t('result.plan')}</span>
              <ResultScopeBadge scope={result.scope} planName={planName(result.planId)} />
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
          />
        </Card>
      ))}
    </Space>
  )
}
