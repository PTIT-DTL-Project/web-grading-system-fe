import { Button, Tag, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { EyeOutlined, UploadOutlined } from '@ant-design/icons'
import { listStudentAssignments } from '../../../shared/api/endpoints/studentAssignments'
import type { AssignmentResponse } from '../../../shared/types/assignment'
import { colors } from '../../../shared/theme/tokens'
import { ListPage } from '../../../shared/ui/ListPage'
import type { FilterConfig } from '../../../shared/ui/FilterBar'

interface StudentClassAssignmentsTabProps {
  classId: string
  archived?: boolean
}

export function StudentClassAssignmentsTab({ classId, archived = false }: StudentClassAssignmentsTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const fetcher = useCallback(
    ({ page, size, search }: { page: number; size: number; search?: string }) =>
      listStudentAssignments(page, size, search, classId),
    [classId],
  )

  const filters: FilterConfig<{ search?: string }>[] = [
    { key: 'search', type: 'text', label: t('assignments.search'), placeholder: t('assignments.search'), submitOnEnter: true },
  ]

  const columns: TableColumnsType<AssignmentResponse> = [
    {
      title: t('assignments.title'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Typography.Link onClick={() => navigate(`/student/assignments/${record.id}`)}>
          {title}
        </Typography.Link>
      ),
    },
    {
      title: t('assignments.published'),
      dataIndex: 'published',
      key: 'published',
      width: 140,
      render: (published: boolean) => (
        <Tag color={published ? colors.success : colors.neutral}>
          {published ? t('assignments.published') : t('assignments.unpublished')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
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
            disabled={archived}
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
      rowKey="id"
      headerTitle={t('assignments.title')}
      emptyTitle={t('assignments.empty')}
      emptyHint={t('assignments.emptyHint')}
      showTotal={(total) => t('assignments.total', { total })}
    />
  )
}
