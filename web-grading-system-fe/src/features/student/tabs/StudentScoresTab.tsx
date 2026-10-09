import { Alert, Button, Result, Space, Spin, Table, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useTranslation } from 'react-i18next'
import { useApiErrorMessage } from '../../../shared/api/errors'
import type { StudentScoreEntryResponse } from '../../../shared/types/score'
import { useStudentScores } from './useStudentScores'

const GRADE_COLORS: Record<string, string> = {
  'A+': 'success',
  A: 'success',
  'B+': 'info',
  B: 'info',
  'C+': 'info',
  C: 'info',
  'D+': 'warning',
  D: 'warning',
  F: 'error',
}

interface StudentScoresTabProps {
  classId: string
}

export function StudentScoresTab({ classId }: StudentScoresTabProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { scores, loading, error, reload } = useStudentScores(classId)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !scores) {
    return (
      <Result
        status="error"
        title={t('scores.loadFailed')}
        subTitle={error ? toMessage(error) : undefined}
        extra={<Button onClick={reload}>{t('common.retry')}</Button>}
      />
    )
  }

  const missing = scores.entries.filter((e) => e.score === null)

  const columns: TableColumnsType<StudentScoreEntryResponse> = [
    {
      title: t('components.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: StudentScoreEntryResponse['type']) => t(`components.typeLabel.${type}`),
    },
    {
      title: t('components.weight'),
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => `${(weight * 100).toFixed(0)}%`,
    },
    {
      title: t('transcript.total'),
      dataIndex: 'score',
      key: 'score',
      render: (score: number | null) => (score !== null ? score.toFixed(2) : t('common.empty')),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Space size={24} wrap>
        <Typography.Text type="secondary">{t('transcript.total')}:</Typography.Text>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {scores.total !== null ? scores.total.toFixed(2) : t('common.empty')}
        </Typography.Title>
        {scores.letterGrade ? (
          <Tag color={GRADE_COLORS[scores.letterGrade] || 'default'}>{scores.letterGrade}</Tag>
        ) : null}
        <Typography.Text type="secondary">
          {t('transcript.gpa')}: {scores.gpa !== null ? scores.gpa.toFixed(1) : t('common.empty')}
        </Typography.Text>
      </Space>

      {scores.total === null && missing.length > 0 && (
        <Alert
          type="info"
          showIcon
          message={`${t('scores.unavailable')}: ${missing
            .map((e) => t(`components.typeLabel.${e.type}`))
            .join(', ')}`}
        />
      )}

      <Table<StudentScoreEntryResponse>
        rowKey="type"
        columns={columns}
        dataSource={scores.entries}
        pagination={false}
        size="middle"
      />
    </Space>
  )
}
