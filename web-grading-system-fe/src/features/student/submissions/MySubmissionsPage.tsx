import { Badge, Button, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { TableColumnsType } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { ListPage } from '../../../shared/ui/ListPage'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import { AssignmentTitle } from './AssignmentTitle'
import { formatDateTime } from '../../../shared/format/formatDateTime'
import type { SubmissionResponse, SubmissionStatus } from '../../../shared/types/submission'
import { colors } from '../../../shared/theme/tokens'
import { useCallback } from 'react'

function statusColor(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    DONE: colors.success,
    GRADING: colors.info,
    FAILED: colors.error,
    PENDING: colors.neutral,
  }
  return map[status] ?? colors.neutral
}

export function MySubmissionsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const fetcher = useCallback(
    ({ page, size }: { page: number; size: number }) => listMySubmissions(page, size),
    [],
  )

  const columns: TableColumnsType<SubmissionResponse> = [
    {
      title: t('submission.assignment'),
      dataIndex: 'assignmentId',
      key: 'assignmentId',
      render: (id: string) => <AssignmentTitle assignmentId={id} />,
    },
    { title: t('submission.fileName'), dataIndex: 'zipFileName', key: 'zipFileName' },
    {
      title: t('submission.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: SubmissionStatus, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag color={statusColor(status)}>{t(`submission.status${status}`)}</Tag>
          {record.latest && <Badge color={colors.success} text={t('submission.latest')} />}
        </div>
      ),
    },
    {
      title: t('submission.submittedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string | null) => (v ? formatDateTime(v, i18n.language) : '—'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/student/submissions/${record.id}/results`)}
            // Review: 2026-10-10 — backend terminal states are DONE (graded)
            // and FAILED (run failed but still writes a result row); only
            // non-terminal PENDING/GRADING stay locked.
            disabled={record.status !== 'DONE' && record.status !== 'FAILED'}
          >
          {t('submission.viewResult')}
        </Button>
      ),
    },
  ]

  return (
    <ListPage<SubmissionResponse, Record<string, never>>
      fetcher={fetcher}
      filters={[]}
      initialFilters={{}}
      columns={columns}
      rowKey="id"
      headerTitle={t('submission.title')}
      emptyTitle={t('submission.empty')}
      emptyHint={t('submission.emptyHint')}
      showTotal={(total) => t('submission.total', { total })}
    />
  )
}
