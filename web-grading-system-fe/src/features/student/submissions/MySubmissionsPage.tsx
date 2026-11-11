import { Badge, Button, Skeleton, Space, Tag, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { TableColumnsType } from 'antd'
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { ListPage } from '../../../shared/ui/ListPage'
import type { FilterConfig } from '../../../shared/ui/FilterBar'
import { listMySubmissions } from '../../../shared/api/endpoints/submissions'
import { getStudentAssignment, listStudentAssignments } from '../../../shared/api/endpoints/studentAssignments'
import { getAssignmentPlans } from '../../../shared/api/endpoints/studentAssignments'
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

// UI review: 2026-11-11 — wrap AssignmentTitle with a Tooltip so the full
// title is visible on hover when the column truncates it with ellipsis.
// Shares the same React Query key as AssignmentTitle so the network call is
// deduped (one fetch per assignment, cached 10 minutes).
function AssignmentTitleWithTooltip({ assignmentId }: { assignmentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['student-assignment', assignmentId],
    queryFn: () => getStudentAssignment(assignmentId),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  })
  if (isLoading) return <Skeleton.Input size="small" active />
  const title = data?.title ?? '—'
  return (
    <Tooltip title={title} placement="topLeft">
      <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
    </Tooltip>
  )
}

// UI review: 2026-11-11 — wrap SubmissionScopeCell with a Tooltip so the full
// scope text (e.g. "Câu: Tạo liên kết Giảng viên...") is visible on hover
// when the column truncates it.
function SubmissionScopeCellWithTooltip({
  assignmentId,
  planId,
}: {
  assignmentId: string
  planId: string | null | undefined
}) {
  const { t } = useTranslation()
  const { data: plans } = useQuery({
    queryKey: ['student-assignment-plans', assignmentId],
    queryFn: () => getAssignmentPlans(assignmentId),
    enabled: !!assignmentId,
    staleTime: 10 * 60 * 1000,
  })
  const isFull = planId === null || planId === undefined
  const planName = !isFull && planId ? (plans?.find((p) => p.id === planId)?.name ?? null) : null
  const tooltipText = isFull
    ? t('result.scopeFull')
    : t('result.scopePlan', { name: planName ?? '—' })
  return (
    <Tooltip title={tooltipText} placement="topLeft">
      <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <SubmissionScopeCell assignmentId={assignmentId} planId={planId} />
      </span>
    </Tooltip>
  )
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
      width: 260,
      render: (id: string) => (
        <AssignmentTitleWithTooltip assignmentId={id} />
      ),
    },
    {
      title: t('submission.fileName'), dataIndex: 'zipFileName', key: 'zipFileName', width: 240,
      render: (value: string) => <Tooltip title={value}><Typography.Text ellipsis>{value}</Typography.Text></Tooltip>,
    },
    {
      title: t('submission.scope'),
      key: 'scope',
      width: 220,
      render: (_, record) => (
        <SubmissionScopeCellWithTooltip assignmentId={record.assignmentId} planId={record.planId} />
      ),
    },
    {
      title: t('submission.status'),
      dataIndex: 'status',
      key: 'status',
      width: 240,
      render: (status: SubmissionStatus, record) => (
        // UI review: 2026-11-11, user-reported overlap — wrap so the "Mới nhất"
        // badge drops to a new line instead of overflowing into the next column.
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag color={statusColor(status)}>{t(`submission.status${status}`)}</Tag>
          {record.latest && <Badge color={colors.success} text={t('submission.latest')} />}
        </div>
      ),
    },
    {
      title: t('submission.submittedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string | null) => (v ? formatDateTime(v, i18n.language) : '—'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 260,
      render: (_, record) => (
          <Space>
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
            <Button size="small" icon={<DownloadOutlined />} onClick={() => navigate(`/student/submissions/${record.id}/viewer`)}>
              {t('submission.viewZip')}
            </Button>
          </Space>
      ),
    },
  ]

  return (
    <ListPage<SubmissionResponse, { search?: string; assignmentId?: string }>
      fetcher={fetcher}
      filters={filters}
      initialFilters={initialFilters}
      columns={columns}
      tableLayout="fixed"
      // UI review: 2026-11-11, user-reported overlap — sum of column widths
      // (260+240+220+240+170+260 = 1390) so the table scrolls horizontally
      // instead of squeezing cells and overlapping content.
      tableScrollX={1390}
      rowKey="id"
      headerTitle={t('submission.title')}
      emptyTitle={t('submission.empty')}
      emptyHint={t('submission.emptyHint')}
      showTotal={(total) => t('submission.total', { total })}
    />
  )
}
