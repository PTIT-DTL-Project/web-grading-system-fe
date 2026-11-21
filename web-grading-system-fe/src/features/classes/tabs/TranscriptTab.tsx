"use client"

import { Alert, Button, Input, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { SearchOutlined } from '@ant-design/icons'
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
  const [search, setSearch] = useState('')
  // Debounced term actually sent to the server: typing a student code should not fire
  // one request per keystroke, and the roster filter is a server-side contains match.
  const [appliedSearch, setAppliedSearch] = useState('')
  const PAGE_SIZE = 20
  const { rows, meta, loading, error, reload } = useTranscript(classId, page, PAGE_SIZE, appliedSearch)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim())
      // A new filter must start at page 1, otherwise the first page of the filtered
      // roster is skipped (or the page index lands past the end and shows "empty").
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])
  const [drawerStudent, setDrawerStudent] = useState<{ code: string; name: string } | null>(null)

  useEffect(() => {
    if (refreshToken !== undefined && refreshToken > 0) {
      reload()
    }
  }, [refreshToken, reload])

  const columns = [
    { title: t('transcript.code'), dataIndex: 'studentCode', key: 'studentCode', width: 160, fixed: 'left' as const },
    { title: t('transcript.name'), dataIndex: 'studentName', key: 'studentName', width: 240, fixed: 'left' as const,
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    ...(rows.length > 0 && rows[0].entries
      ? rows[0].entries.filter(e => e.type !== 'EXERCISE').map((colEntry) => ({
          title: `${colEntry.type} (${(colEntry.weight * 100).toFixed(0)}%)`,
          width: 130,
          dataIndex: 'entries',
          key: colEntry.type,
          render: (entries: TranscriptEntryResponse['entries']) => {
            const match = entries.find(e => e.type === colEntry.type)
            return match?.score !== null && match?.score !== undefined ? match.score : t('common.empty')
          },
        }))
      : []),
    { title: t('transcript.total'), dataIndex: 'total', key: 'total', width: 110, render: (v: number | null) => v !== null ? v : t('common.empty') },
    { title: t('transcript.letterGrade'), dataIndex: 'letterGrade', key: 'letterGrade', width: 130, render: (v: string | null) => v ? <Tag color={GRADE_COLORS[v] || 'default'}>{v}</Tag> : t('common.empty') },
    { title: t('transcript.gpa'), dataIndex: 'gpa', key: 'gpa', width: 90, render: (v: number | null) => v !== null ? v : t('common.empty') },
    { title: t('common.actions'), key: 'actions', width: 180, fixed: 'right' as const, render: (_: unknown, record: TranscriptEntryResponse) => (
      <Button type="primary" size="small" onClick={() => setDrawerStudent({ code: record.studentCode, name: record.studentName })}>
        {t('transcript.enterScores')}
      </Button>
    )},
  ]

  const hasError = Boolean(error)

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('transcript.title')}</Typography.Title>
        <Input
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<SearchOutlined />}
          placeholder={t('transcript.searchPlaceholder')}
          aria-label={t('transcript.searchPlaceholder')}
          style={{ width: 280 }}
        />
      </div>

      {hasError && (
        <Alert type="error" showIcon message={t('transcript.loadFailed')} description={error instanceof Error ? error.message : String(error)} action={<Button onClick={reload}>{t('common.retry')}</Button>} style={{ marginBottom: 16 }} />
      )}

      {rows.length === 0 && !loading && !hasError && (
        <Alert
          type="info"
          showIcon
          message={appliedSearch ? t('transcript.noMatch') : t('transcript.empty')}
          description={appliedSearch ? t('transcript.noMatchHint', { search: appliedSearch }) : t('transcript.emptyHint')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table<TranscriptEntryResponse>
        rowKey="studentCode"
        columns={columns}
        dataSource={rows}
        tableLayout="fixed"
        scroll={{ x: 'max-content' }}
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
