import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
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

export function StudentAssignmentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toMessage = useApiErrorMessage()
  const { assignment, plans, images, loading, error, reload } = useStudentAssignment(id ?? '')
  const [submitOpen, setSubmitOpen] = useState(false)

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
                  {assignment.maxCpu} cores
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
              children: plan.description ? (
                <Typography.Text type="secondary">{plan.description}</Typography.Text>
              ) : null,
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
