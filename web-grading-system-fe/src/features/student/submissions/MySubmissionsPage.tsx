import { Badge, Button, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { TableColumnsType } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { ListPage } from '../../../shared/ui/ListPage'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import type { SubmissionResponse, SubmissionStatus } from '../../../shared/types/submission'
import { colors } from '../../../shared/theme/tokens'
import { useCallback } from 'react'

function statusColor(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    GRADED: colors.success,
    GRADING: colors.info,
    FAILED: colors.error,
    QUEUED: colors.warning,
    UPLOADED: colors.info,
    PENDING: colors.neutral,
  }
  return map[status] ?? colors.neutral
}

export function MySubmissionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const fetcher = useCallback(
    ({ page, size }: { page: number; size: number }) => listMySubmissions(page, size),
    [],
  )

  const columns: TableColumnsType<SubmissionResponse> = [
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
      render: (v: string | null) => (v ? new Date(v).toLocaleString('vi-VN') : '—'),
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
          disabled={record.status !== 'GRADED'}
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
