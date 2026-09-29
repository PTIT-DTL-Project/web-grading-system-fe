"use client"

import { Alert, Button, Space, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTranscript } from '../useTranscript'
import { StudentScoreDrawer } from './StudentScoreDrawer'
import type { TranscriptEntryResponse } from '../../../shared/types/score'

interface TranscriptTabProps {
  classId: string
  refreshToken?: number
  onSaved?: () => void
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'success',
  'A': 'success',
  'B+': 'info',
  'B': 'info',
  'C+': 'info',
  'C': 'info',
  'D+': 'warning',
  'D': 'warning',
  'F': 'error',
}

export function TranscriptTab({ classId, refreshToken, onSaved }: TranscriptTabProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const { rows, meta, loading, error, reload } = useTranscript(classId, page, PAGE_SIZE)
  const [drawerStudent, setDrawerStudent] = useState<{ code: string; name: string } | null>(null)

  useEffect(() => {
    if (refreshToken !== undefined && refreshToken > 0) {
      reload()
    }
  }, [refreshToken, reload])

  const columns = [
    { title: t('transcript.code'), dataIndex: 'studentCode', key: 'studentCode' },
    { title: t('transcript.name'), dataIndex: 'studentName', key: 'studentName' },
    ...(rows.length > 0 && rows[0].entries
      ? rows[0].entries.filter(e => e.type !== 'EXERCISE').map((colEntry) => ({
          title: `${colEntry.type} (${(colEntry.weight * 100).toFixed(0)}%)`,
          dataIndex: 'entries',
          key: colEntry.type,
          render: (entries: any[]) => {
            const match = entries.find(e => e.type === colEntry.type)
            return match?.score !== null && match?.score !== undefined ? match.score : t('common.empty')
          },
        }))
      : []),
    { title: t('transcript.total'), dataIndex: 'total', key: 'total', render: (v: number | null) => v !== null ? v : t('common.empty') },
    { title: t('transcript.letterGrade'), dataIndex: 'letterGrade', key: 'letterGrade', render: (v: string | null) => v ? <Tag color={GRADE_COLORS[v] || 'default'}>{v}</Tag> : t('common.empty') },
    { title: t('transcript.gpa'), dataIndex: 'gpa', key: 'gpa', render: (v: number | null) => v !== null ? v : t('common.empty') },
    { title: t('common.actions'), key: 'actions', render: (_: unknown, record: TranscriptEntryResponse) => (
      <Button type="primary" size="small" onClick={() => setDrawerStudent({ code: record.studentCode, name: record.studentName })}>
        {t('transcript.enterScores')}
      </Button>
    )},
  ]

  const hasError = Boolean(error)

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <Typography.Title level={4} style={{ margin: 0 }}>{t('transcript.title')}</Typography.Title>

      {hasError && (
        <Alert type="error" showIcon message={t('transcript.loadFailed')} description={error instanceof Error ? error.message : String(error)} action={<Button onClick={reload}>{t('common.retry')}</Button>} style={{ marginBottom: 16 }} />
      )}

      {rows.length === 0 && !loading && !hasError && (
        <Alert
          type="info"
          showIcon
          message={t('transcript.empty')}
          description={t('transcript.emptyHint')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<TranscriptEntryResponse>
        rowKey="studentCode"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{
          current: meta.page + 1,
          pageSize: meta.pageSize,
          total: meta.total,
          showSizeChanger: false,
          showTotal: (total) => t('transcript.totalStudents', { total }),
          onChange: (nextPage) => setPage(nextPage - 1),
        }}
      />

      {drawerStudent && (
        <StudentScoreDrawer
          classId={classId}
          studentCode={drawerStudent.code}
          studentName={drawerStudent.name}
          visible={true}
          onClose={() => setDrawerStudent(null)}
          onSave={() => {
            onSaved?.()
            reload()
          }}
          entries={rows.find(r => r.studentCode === drawerStudent.code)?.entries || []}
        />
      )}
    </Space>
  )
}
