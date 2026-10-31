import { Badge, Button, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { TableColumnsType } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { ListPage } from '../../../shared/ui/ListPage'
import type { FilterConfig } from '../../../shared/ui/FilterBar'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import { listStudentAssignments } from '../../../shared/api/endpoints/studentAssignments'
import { AssignmentTitle } from './AssignmentTitle'
import { SubmissionScopeCell } from './SubmissionScopeCell'
import { formatDateTime } from '../../../shared/format/formatDateTime'
import type { SubmissionResponse, SubmissionStatus } from '../../../shared/types/submission'
import type { AssignmentResponse, AssignmentPurpose } from '../../../shared/types/assignment'
import { colors } from '../../../shared/theme/tokens'
import { useCallback, useEffect, useState } from 'react'

// Hoisted stable identity so useList's parent-sync effect (useList.ts:131-140)
// does not reset filters on every render — see AssignmentSubmissionsPage.tsx:30.
const EMPTY_FILTERS: { search?: string; assignmentId?: string } = {}

function statusColor(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    DONE: colors.success,
    GRADING: colors.info,
    FAILED: colors.error,
    PENDING: colors.neutral,
  }
  return map[status] ?? colors.neutral
}

/** Fetch every page of assignments for one purpose (follows meta.pages). */
async function fetchAllAssignments(purpose: AssignmentPurpose): Promise<AssignmentResponse[]> {
  const all: AssignmentResponse[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const res = await listStudentAssignments(page, 100, undefined, undefined, purpose, undefined)
    all.push(...res.result)
    totalPages = res.meta.pages
    page += 1
  }
  return all
}

export function MySubmissionsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [assignmentOptions, setAssignmentOptions] = useState<{ label: string; value: string }[]>([])

  // Load enrolled assignments (GRADED + PRACTICE) for the assignment dropdown filter.
  // Follows meta.pages so the list is complete even with more than 100 assignments.
  useEffect(() => {
    Promise.all([
      fetchAllAssignments('GRADED' as AssignmentPurpose),
      fetchAllAssignments('PRACTICE' as AssignmentPurpose),
    ])
      .then(([graded, practice]) => {
        const all = [...graded, ...practice]
        setAssignmentOptions(
          all.map((a: AssignmentResponse) => ({
            label: a.title,
            value: a.id,
          })),
        )
      })
      .catch(() => {
        // Non-critical: dropdown fails closed (empty list), page still works.
        setAssignmentOptions([])
      })
  }, [])

  const fetcher = useCallback(
    ({ page, size, search, assignmentId }: { page: number; size: number; search?: string; assignmentId?: string }) =>
      listMySubmissions(page, size, search, assignmentId),
    [],
  )

  const filters: FilterConfig<{ search?: string; assignmentId?: string }>[] = [
    { key: 'search', type: 'text', label: t('submission.search'), placeholder: t('submission.search'), submitOnEnter: true },
    {
      key: 'assignmentId',
      type: 'select',
      label: t('submission.assignment'),
      placeholder: t('submission.assignmentPlaceholder'),
      options: [{ label: t('submission.assignmentAll'), value: '' }, ...assignmentOptions],
    },
  ]

  // Empty initialFilters: useList hydrates assignmentId from the URL on mount,
  // and resetFilters clears to {} so "Clear filters" works even from deep links.
  const initialFilters = EMPTY_FILTERS

  const columns: TableColumnsType<SubmissionResponse> = [
    {
      title: t('submission.assignment'),
      dataIndex: 'assignmentId',
      key: 'assignmentId',
      render: (id: string) => <AssignmentTitle assignmentId={id} />,
    },
    { title: t('submission.fileName'), dataIndex: 'zipFileName', key: 'zipFileName' },
    {
      title: t('submission.scope'),
      key: 'scope',
      width: 170,
      render: (_, record) => (
        <SubmissionScopeCell assignmentId={record.assignmentId} planId={record.planId} />
      ),
    },
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
    <ListPage<SubmissionResponse, { search?: string; assignmentId?: string }>
      fetcher={fetcher}
      filters={filters}
      initialFilters={initialFilters}
      columns={columns}
      rowKey="id"
      headerTitle={t('submission.title')}
      emptyTitle={t('submission.empty')}
      emptyHint={t('submission.emptyHint')}
      showTotal={(total) => t('submission.total', { total })}
    />
  )
}
