import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Result,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  HistoryOutlined,
  RobotOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useStudentAssignment } from './useStudentAssignment'
import { SubmitAssignmentModal } from './SubmitAssignmentModal'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import { StepDetailView } from '../../../shared/ui/StepDetailView'
import { normalizeStudentStep } from '../../../shared/ui/stepDetail'
import type { StepResponse } from '../../../shared/types/assignment'

// Review: 2026-10-09 — UC-04 Step 2: step description verbatim; auto-generated
// fallback from the sanitized config only when description is null/empty.
function asConfigRecord(config: unknown): Record<string, unknown> | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  return config as Record<string, unknown>
}

function stepAutoText(t: TFunction, step: StepResponse): string | null {
  const config = asConfigRecord(step.config)
  if (!config) return null
  switch (step.type) {
    case 'HTTP_REQUEST': {
      const method = typeof config.method === 'string' ? config.method : 'GET'
      const path = typeof config.path === 'string' ? config.path : '/'
      const expected =
        typeof config.expected_status === 'number'
          ? ` ${t('step.expectStatus', { status: config.expected_status })}`
          : ''
      return `${method} ${path}${expected}`
    }
    case 'DB_QUERY': {
      if (typeof config.query !== 'string') return null
      const firstLine = config.query.split('\n')[0].trim()
      return firstLine.length > 120 ? `${firstLine.slice(0, 120)}…` : firstLine
    }
    case 'DB_SCHEMA_CHECK': {
      if (!Array.isArray(config.checks)) return null
      const kinds = config.checks
        .map((check) =>
          check && typeof check === 'object'
            ? (check as Record<string, unknown>).kind
            : null,
        )
        .filter((kind): kind is string => typeof kind === 'string')
      const unique = [...new Set(kinds)]
      return `${t('step.schemaChecks', { count: config.checks.length })}${unique.length ? ` (${unique.join(', ')})` : ''}`
    }
    case 'DB_MIGRATION': {
      const count = Array.isArray(config.statements) ? config.statements.length : 0
      return t('step.migrationStatements', { count })
    }
    default:
      return null
  }
}

export function StudentAssignmentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toMessage = useApiErrorMessage()
  const { assignment, plans, images, loading, error, reload } = useStudentAssignment(id ?? '')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('submit') === '1') {
      setSubmitOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Spin size="large" />
      </div>
    )
  }
  if (error) {
    return (
      <Result
        status="error"
        title={t('assignments.detailLoadFailed')}
        subTitle={toMessage(error)}
        extra={
          <Space>
            <Button onClick={reload}>{t('common.retry')}</Button>
            <Button onClick={() => navigate('/student/assignments')}>
              {t('assignments.back')}
            </Button>
          </Space>
        }
      />
    )
  }
  if (!assignment) return <Result status="404" title={t('assignments.notFound')} />

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/student/assignments')}
          >
            {t('assignments.back')}
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {assignment.title}
          </Typography.Title>
          <Tag color={assignment.published ? colors.success : colors.neutral}>
            {assignment.published ? t('assignments.published') : t('assignments.unpublished')}
          </Tag>
        </div>
        <Space>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => navigate('/student/submissions')}
          >
            {t('assignments.viewSubmissions')}
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            style={{ background: colors.primary, borderColor: colors.primary }}
            onClick={() => setSubmitOpen(true)}
          >
            {t('assignments.submit')}
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <CodeOutlined style={{ color: colors.primary }} />
                {t('assignments.description')}
              </Space>
            }
            style={{ borderColor: colors.border }}
          >
            {assignment.description ? (
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {assignment.description}
              </Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary">
                {t('assignments.noDescription')}
              </Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: colors.primary }} />
                {t('assignments.details')}
              </Space>
            }
            style={{ borderColor: colors.border }}
          >
            <Descriptions column={1} size="small">
              {assignment.executionTimeoutMs && (
                <Descriptions.Item label={t('assignments.executionTimeout')}>
                  {assignment.executionTimeoutMs} ms
                </Descriptions.Item>
              )}
              {assignment.startupTimeoutMs && (
                <Descriptions.Item label={t('assignments.startupTimeout')}>
                  {assignment.startupTimeoutMs} ms
                </Descriptions.Item>
              )}
              {assignment.maxMemoryMb && (
                <Descriptions.Item label={t('assignments.maxMemory')}>
                  {assignment.maxMemoryMb} MB
                </Descriptions.Item>
              )}
              {assignment.maxCpu && (
                <Descriptions.Item label={t('assignments.maxCpu')}>
                  {assignment.maxCpu} {t('assignments.cores')}
                </Descriptions.Item>
              )}
              {assignment.dockerComposePort && (
                <Descriptions.Item label={t('assignments.port')}>
                  {assignment.dockerComposePort}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <CheckCircleOutlined style={{ color: colors.primary }} />
            {t('assignments.testPlans')}
          </Space>
        }
        style={{ borderColor: colors.border }}
      >
        {plans.length === 0 ? (
          <Empty description={t('assignments.noPlans')} />
        ) : (
          <Collapse
            items={plans.map((plan) => ({
              key: plan.id,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>{plan.name}</span>
                  <Tag color={colors.info}>
                    {t('assignments.planWeight', { weight: plan.weight })}
                  </Tag>
                  <Tag>{t('assignments.planSteps', { count: plan.steps.length })}</Tag>
                </div>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  {plan.description ? (
                    <Typography.Text type="secondary">{plan.description}</Typography.Text>
                  ) : null}
                  {plan.steps.map((step) => {
                    const text = step.description?.trim()
                      ? step.description
                      : stepAutoText(t, step)
                    const expanded = expandedStepId === step.id
                    return (
                      <div key={step.id}>
                        <Typography.Text strong>{step.name}</Typography.Text>
                        {text ? (
                          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                            {text}
                          </Typography.Text>
                        ) : null}
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setExpandedStepId(expanded ? null : step.id)}
                        >
                          {expanded ? t('common.collapse') : t('common.expand')}
                        </Button>
                        {expanded && (
                          <div style={{ margin: '8px 0 8px 16px' }}>
                            <StepDetailView model={normalizeStudentStep(step)} variant="contract" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Space>
              ),
            }))}
          />
        )}
      </Card>

      {images.length > 0 && (
        <Card
          title={
            <Space>
              <RobotOutlined style={{ color: colors.primary }} />
              {t('assignments.dockerImages')}
            </Space>
          }
          style={{ borderColor: colors.border }}
        >
          <Space wrap>
            {images.map((img) => (
              <Tag key={img.id} style={{ padding: '4px 12px' }}>
                {img.name}:{img.tag}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      <SubmitAssignmentModal
        assignmentId={assignment.id}
        plans={plans}
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSuccess={(submissionId) =>
          navigate(`/student/submissions/${submissionId}/results`)
        }
      />
    </Space>
  )
}
