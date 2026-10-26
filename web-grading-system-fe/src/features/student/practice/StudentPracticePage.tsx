import { Button, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { EyeOutlined, UploadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { useCallback } from 'react'
import { ListPage } from '../../../shared/ui/ListPage'
import type { FilterConfig } from '../../../shared/ui/FilterBar'
import { listStudentAssignments } from '../../../shared/api/endpoints/studentAssignments'
import type { AssignmentResponse } from '../../../shared/types/assignment'
import { colors } from '../../../shared/theme/tokens'

export function StudentPracticePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const fetcher = useCallback(
    ({ page, size, search, topic }: { page: number; size: number; search?: string; topic?: string }) =>
      listStudentAssignments(page, size, search, undefined, 'PRACTICE', topic),
    [],
  )

  const filters: FilterConfig<{ search?: string; topic?: string }>[] = [
    { key: 'search', type: 'text', label: t('assignments.search'), placeholder: t('assignments.search'), submitOnEnter: true },
    { key: 'topic', type: 'text', label: t('assignment.topic'), placeholder: t('assignment.topicPlaceholder'), submitOnEnter: true },
  ]

  const columns: TableColumnsType<AssignmentResponse> = [
    {
      title: t('assignments.title'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Typography.Link style={{ overflowWrap: 'anywhere' }} onClick={() => navigate(`/student/practice/${record.id}`)}>
          {title}
        </Typography.Link>
      ),
    },
    {
      title: t('assignment.topic'),
      dataIndex: 'topic',
      key: 'topic',
      width: 150,
      render: (v: string) => <span style={{ overflowWrap: 'anywhere' }}>{v || '—'}</span>,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/student/practice/${record.id}`)}>
            {t('assignments.details')}
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<UploadOutlined />}
            style={{ background: colors.primary, borderColor: colors.primary }}
            onClick={() => navigate(`/student/practice/${record.id}?submit=1`)}
          >
            {t('assignments.submit')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <ListPage<AssignmentResponse, { search?: string; topic?: string }>
      fetcher={fetcher}
      filters={filters}
      initialFilters={{}}
      columns={columns}
      tableScrollX={680}
      rowKey="id"
      headerTitle={t('practice.title')}
      emptyTitle={t('practice.empty')}
      emptyHint={t('practice.emptyHint')}
      showTotal={(total) => t('assignments.total', { total })}
    />
  )
}
