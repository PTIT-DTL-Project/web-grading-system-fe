import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Result, Space, Spin, Tabs, Typography, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useStudentClass } from './useStudentClass'
import { StudentClassAssignmentsTab } from './tabs/StudentClassAssignmentsTab'
import { StudentScoresTab } from './tabs/StudentScoresTab'
import { StudentRosterTab } from './tabs/StudentRosterTab'
import { colors } from '../../shared/theme/tokens'
import { useApiErrorMessage } from '../../shared/api/errors'

export function StudentClassDetailPage() {
  const { t } = useTranslation()
  const { classId } = useParams()
  const navigate = useNavigate()
  const { klass, loading, error, reload } = useStudentClass(classId ?? '')
  const toMessage = useApiErrorMessage()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title={t('detail.loadFailed')}
        subTitle={toMessage(error)}
        extra={
          <Space direction="horizontal" size={12}>
            <Button onClick={reload}>{t('common.retry')}</Button>
            <Button onClick={() => navigate('/student/classes')}>{t('common.back')}</Button>
          </Space>
        }
      />
    )
  }

  if (!klass) {
    return <Result status="404" title={t('detail.notFound')} />
  }

  const isArchived = klass.status === 'ARCHIVED'

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, flex: '1 1 320px' }}>
          <Button type="text" onClick={() => navigate('/student/classes')} icon={<ArrowLeftOutlined />}>
            {t('detail.back')}
          </Button>
          <Typography.Title level={3} style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
            {klass.name}
          </Typography.Title>
        </div>
        <Space wrap size={[8, 8]}>
          <Typography.Text type="secondary">{t('classes.semester')}: {klass.semester}</Typography.Text>
          <Tag color={isArchived ? colors.statusArchived : colors.statusActive}>
            {isArchived ? t('classes.statusArchived') : t('classes.statusActive')}
          </Tag>
        </Space>
      </div>

      {isArchived && (
        <Alert
          message={t('classes.archivedBanner')}
          description={t('classes.readOnlyMessage')}
          type="warning"
          showIcon
        />
      )}

      <div
        style={{
          background: colors.surface,
          borderRadius: 8,
          padding: 24,
          border: `1px solid ${colors.border}`,
          minHeight: 360,
        }}
      >
        <Tabs
          defaultActiveKey="assignments"
          items={[
            { key: 'assignments', label: t('detail.tabAssignments'), children: <StudentClassAssignmentsTab classId={klass.id} archived={isArchived} /> },
            { key: 'scores', label: t('detail.tabMyScores'), children: <StudentScoresTab classId={klass.id} /> },
            { key: 'students', label: t('detail.tabStudents'), children: <StudentRosterTab classId={klass.id} /> },
          ]}
        />
      </div>
    </Space>
  )
}
