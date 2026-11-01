import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router'
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
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  HistoryOutlined,
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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const toMessage = useApiErrorMessage()
  // Bài tập luyện tập nằm ngoài lớp → quay về trang practice, ngược lại về trang assignments.
  const backPath = location.pathname.startsWith('/student/practice') ? '/student/practice' : '/student/assignments'
  const { assignment, plans, myResults, loading, error, reload } = useStudentAssignment(id ?? '')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set())
  const [expandAll, setExpandAll] = useState(false)

  const allStepIds = plans.flatMap((p) => p.steps.map((s) => s.id))

  const toggleExpandAll = () => {
    setExpandAll((prev) => {
      const next = !prev
      if (next) {
        setExpandedStepIds(new Set(allStepIds))
      } else {
        setExpandedStepIds(new Set())
      }
      return next
    })
  }

  const isStepExpanded = (stepId: string) => expandedStepIds.has(stepId)

  // Điểm cả bài (thang 10) do backend tính weighted: bài chưa nộp = 0,
  // attempted-but-infra-failed = null (hiện '—'). Không tự cộng lại ở FE.
  const exerciseScore = myResults?.exerciseScore ?? null
  const resultRows = Array.isArray(myResults?.results) ? myResults.results : []

  // Điểm 1 plan: ưu tiên row PLAN của chính plan đó; nếu sinh viên nộp nguyên
  // bài (FULL row) thì derive từ steps theo đúng công thức backend
  // (bỏ skipped, 10 × passedWeight / ranWeight).
  const planScore = (planId: string): { score: number; max: number } | null => {
    const planRow = resultRows.find((r) => r.planId === planId)
    if (planRow && planRow.score !== null && planRow.score !== undefined && planRow.maxScore !== null && planRow.maxScore !== undefined) {
      return { score: planRow.score, max: planRow.maxScore }
    }
    const fullRows = resultRows.filter((r) => !r.planId)
    if (fullRows.length !== 1) return null
    const fullRow = fullRows[0]
    if (!Array.isArray(fullRow.steps)) return null
    const steps = fullRow.steps.filter((s) => s.planId === planId && !s.skipped)
    if (steps.length === 0) return null
    const ranWeight = steps.reduce((sum, s) => {
      const w = typeof s.weight === 'number' ? s.weight : 1
      return sum + w
    }, 0)
    if (ranWeight === 0) return null
    const passedWeight = steps
      .filter((s) => s.passed)
      .reduce((sum, s) => {
        const w = typeof s.weight === 'number' ? s.weight : 1
        return sum + w
      }, 0)
    return { score: (10 * passedWeight) / ranWeight, max: 10 }
  }

  // Câu đã được nộp hay chưa: có row PLAN cho chính câu đó, hoặc có step của câu đó
  // trong row FULL (nộp nguyên bài). Câu chưa nộp vẫn ăn 0 điểm trong điểm cả bài
  // (backend weighted: chưa nộp = 0 × weight, vẫn cộng weight vào mẫu số), nên UI
  // phải hiện 0.00 chứ không phải "—" — "—" chỉ dành cho trường hợp không chấm được.
  const planSubmitted = (planId: string): boolean => {
    if (resultRows.some((r) => r.planId === planId)) return true
    const fullRows = resultRows.filter((r) => !r.planId)
    if (fullRows.length !== 1) return false
    const fullRow = fullRows[0]
    if (!Array.isArray(fullRow.steps)) return false
    return Boolean(fullRow.steps.some((s) => s.planId === planId))
  }

  // Điểm 1 step: tìm trong mọi row (row PLAN lẫn FULL đều mang stepId).
  const findStepResult = (stepId: string) => {
    for (const row of resultRows) {
      const match = row.steps.find((s) => s.stepId === stepId)
      if (match) return match
    }
    return null
  }

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
            <Button onClick={() => navigate(backPath)}>
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
            onClick={() => navigate(backPath)}
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
            onClick={() => navigate(`/student/submissions?assignmentId=${assignment.id}`)}
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

      {myResults && (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card style={{ borderColor: colors.border, textAlign: 'center' }}>
              <Statistic
                title={t('result.totalScore', {
                  score: exerciseScore !== null ? exerciseScore.toFixed(2) : '—',
                  max: '10.00',
                })}
                value={exerciseScore !== null ? exerciseScore.toFixed(2) : '—'}
                suffix={exerciseScore !== null ? '/ 10.00' : undefined}
                valueStyle={{
                  color:
                    exerciseScore === null
                      ? colors.neutral
                      : exerciseScore >= 5
                        ? colors.success
                        : colors.error,
                  fontSize: 32,
                  fontWeight: 700,
                }}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('assignments.scoreWeightedHint')}
              </Typography.Text>
            </Card>
          </Col>
        </Row>
      )}

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
            {plans.length > 0 && (
              <Button
                type="link"
                size="small"
                onClick={toggleExpandAll}
              >
                {expandAll ? t('common.collapseAll') : t('common.expandAll')}
              </Button>
            )}
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
                  {(() => {
                    const ps = planScore(plan.id)
                    if (ps) {
                      return (
                        <Tag color={ps.score >= ps.max * 0.5 ? 'green' : 'red'}>
                          {ps.score.toFixed(2)} / {ps.max.toFixed(2)}
                        </Tag>
                      )
                    }
                    // Chưa nộp ≠ không chấm được: câu chưa nộp vẫn được tính 0 điểm
                    // trong điểm cả bài, nên hiện đúng con số thay vì dấu "—".
                    if (!planSubmitted(plan.id)) {
                      return (
                        <Tooltip title={t('assignments.planNotSubmittedHint')}>
                          <Tag color="default">
                            0.00 / 10.00 · {t('assignments.planNotSubmitted')}
                          </Tag>
                        </Tooltip>
                      )
                    }
                    return <Tag color="default">—</Tag>
                  })()}
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
                    const expanded = isStepExpanded(step.id)
                    return (
                      <div key={step.id}>
                        <Typography.Text strong>{step.name}</Typography.Text>
                        {text ? (
                          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                            {text}
                          </Typography.Text>
                        ) : null}
                        {(() => {
                          const stepResult = findStepResult(step.id)
                          if (!stepResult) return <Tag color="default">—</Tag>
                          if (stepResult.skipped) return <Tag>{t('result.skipped')}</Tag>
                          return (
                            <Tag color={stepResult.passed ? 'green' : 'red'}>
                              {(stepResult.score ?? 0).toFixed(2)} / {stepResult.weight ?? 0}
                            </Tag>
                          )
                        })()}
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            setExpandedStepIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(step.id)) {
                                next.delete(step.id)
                              } else {
                                next.add(step.id)
                              }
                              return next
                            })
                            setExpandAll(false)
                          }}
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
