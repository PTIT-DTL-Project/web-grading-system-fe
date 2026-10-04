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
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import type { ResultResponse, StepResultResponse } from '../../../shared/types/result'

export function SubmissionResultPage() {
  const { t } = useTranslation()
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const { results, loading, error, isReady } = useSubmissionResult(submissionId ?? '')

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
      render: (passed: boolean) => {
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
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('result.title')}
        </Typography.Title>
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
                color: totalScore / totalMax >= 0.5 ? colors.success : colors.error,
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
              message={t('result.summaryLog')}
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
