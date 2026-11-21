import { Tag, Button, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { EyeOutlined, UploadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { ListPage } from '../../../shared/ui/ListPage'
import { useTopicOptions } from '../../assignments/useTopicOptions'
import type { FilterConfig } from '../../../shared/ui/FilterBar'
import { listStudentAssignments } from '../../../shared/api/endpoints/studentAssignments'
import type { AssignmentResponse } from '../../../shared/types/assignment'
import { colors } from '../../../shared/theme/tokens'
import { useCallback } from 'react'

export function StudentAssignmentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const fetcher = useCallback(
    ({ page, size, search, topic }: { page: number; size: number; search?: string; topic?: string }) =>
      listStudentAssignments(page, size, search, undefined, undefined, topic),
    [],
  )

  const { options: topicOptions } = useTopicOptions({ role: 'STUDENT', purpose: 'GRADED' })

  const filters: FilterConfig<{ search?: string; topic?: string }>[] = [
    { key: 'search', type: 'text', label: t('assignments.search'), placeholder: t('assignments.search'), submitOnEnter: true },
    // Topic is an exact-match server filter, so it must be a pick-list of topics that
    // exist; free text never matched a longer topic ("quản lý" vs "quản lý sinh viên").
    // Review: 2026-11-12, lecturer report on the class Assignments tab.
    {
      key: 'topic',
      type: 'select',
      label: t('assignment.topic'),
      placeholder: t('assignment.topicPlaceholder'),
      options: topicOptions,
    },
  ]

  const columns: TableColumnsType<AssignmentResponse> = [
    {
      title: t('assignments.title'),
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (title: string, record) => (
        <Tooltip title={title}>
          <Typography.Link style={{ overflowWrap: 'anywhere' }} onClick={() => navigate(`/student/assignments/${record.id}`)}>
            {title}
          </Typography.Link>
        </Tooltip>
      ),
    },
    {
      title: t('assignment.topic'),
      dataIndex: 'topic',
      key: 'topic',
      width: 480,
      render: (v: string) => (
        <Tooltip title={v || '—'}>
          <Typography.Paragraph
            ellipsis={{ rows: 2 }}
            style={{ margin: 0, overflowWrap: 'anywhere' }}
          >
            {v || '—'}
          </Typography.Paragraph>
        </Tooltip>
      ),
    },
    {
      title: t('assignments.published'),
      dataIndex: 'published',
      key: 'published',
      width: 160,
      render: (published: boolean) => (
        <Tag color={published ? colors.success : colors.neutral}>
          {published ? t('assignments.published') : t('assignments.unpublished')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/student/assignments/${record.id}`)}
          >
            {t('assignments.details')}
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<UploadOutlined />}
            style={{ background: colors.primary, borderColor: colors.primary }}
            onClick={() => navigate(`/student/assignments/${record.id}?submit=1`)}
          >
            {t('assignments.submit')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <ListPage<AssignmentResponse, { search?: string }>
      fetcher={fetcher}
      filters={filters}
      initialFilters={{}}
      columns={columns}
      tableLayout="fixed"
      tableScrollX={1180}
      rowKey="id"
      headerTitle={t('assignments.title')}
      emptyTitle={t('assignments.empty')}
      emptyHint={t('assignments.emptyHint')}
      showTotal={(total) => t('assignments.total', { total })}
    />
  )
}
