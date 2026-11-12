import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Result, Space, Spin, Tabs, Typography, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useClassDetail } from './useClassDetail'
import { AssignmentTab } from './tabs/AssignmentTab'
import { StudentsTab } from './tabs/StudentsTab'
import { ScoreComponentsTab } from './tabs/ScoreComponentsTab'
import { TranscriptTab } from './tabs/TranscriptTab'
import { colors } from '../../shared/theme/tokens'
import { useApiErrorMessage } from '../../shared/api/errors'
import { useState, useCallback } from 'react'

export function ClassDetailPage() {
  const { t } = useTranslation()
  const { classId } = useParams()
  const navigate = useNavigate()
  const { klass, loading, error, reload } = useClassDetail(classId ?? '')
  const toMessage = useApiErrorMessage()
  const [refreshToken, setRefreshToken] = useState(0)

  const refreshAll = useCallback(() => {
    setRefreshToken(v => v + 1)
    reload()
  }, [reload])

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
            <Button onClick={() => navigate('/classes')}>{t('common.back')}</Button>
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
          <Button type="text" onClick={() => navigate('/classes')} icon={<ArrowLeftOutlined />}>
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
            { key: 'assignments', label: t('detail.tabAssignments'), children: <AssignmentTab classId={klass.id} ownerId={klass.ownerId} archived={isArchived} refreshToken={refreshToken} onSaved={refreshAll} /> },
            { key: 'students', label: t('detail.tabStudents'), children: <StudentsTab classId={klass.id} archived={isArchived} refreshToken={refreshToken} onSaved={refreshAll} /> },
            { key: 'components', label: t('detail.tabComponents'), children: <ScoreComponentsTab classId={klass.id} archived={isArchived} refreshToken={refreshToken} onSaved={refreshAll} /> },
            { key: 'transcript', label: t('detail.tabTranscript'), children: <TranscriptTab classId={klass.id} refreshToken={refreshToken} onSaved={refreshAll} /> },
          ]}
        />
      </div>
    </Space>
  )
}
