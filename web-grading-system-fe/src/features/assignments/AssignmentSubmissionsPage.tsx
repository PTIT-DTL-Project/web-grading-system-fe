"use client"

import { useCallback, useMemo, useState } from 'react'
import { Tag, Typography, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { ListPage } from '../../shared/ui/ListPage'
import type { FilterConfig } from '../../shared/ui/FilterBar'
import { useAssignmentStudents } from './useAssignmentStudents'
import { listSubmissions } from '../../shared/api/endpoints/assignments'
import type { SubmissionResponse } from '../../shared/types/assignment'
import type { Page } from '../../shared/types/pagination'
import { formatDateTime } from '../../shared/format/formatDateTime'

interface SubmissionsFilters {
  studentCode?: string
}

// Hoisted for a stable identity so ListPage's useList parent-sync effect
// (dep [filters]) does not refire every render. (Review: 2026-10-18, Pullfrog)
const EMPTY_FILTERS: SubmissionsFilters = { studentCode: '' }

// The endpoint returns the filtered list (course-service applies ?studentCode=
// server-side); page it here for the ListPage shell since class sizes are bounded.
function pageOf(rows: SubmissionResponse[], page: number, size: number): Page<SubmissionResponse> {
  const total = rows.length
  return {
    meta: { page, pageSize: size, pages: Math.max(1, Math.ceil(total / size)), total },
    result: rows.slice(page * size, page * size + size),
  }
}

export function AssignmentSubmissionsPage() {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const { data: studentOptions } = useAssignmentStudents(assignmentId ?? '', 'submissions')

  // Stable data/refresh wiring: ListPage feeds `fetcher` and `initialFilters` into useList,
  // whose parent-sync effect refires on a fresh identity — so both must be stable refs or
  // the page loops like the old ResultsPage. (Review: 2026-10-18, Pullfrog)
  const fetcher = useCallback(
    ({ page, size, studentCode }: { page: number; size: number; studentCode?: string }) =>
      listSubmissions(assignmentId ?? '', studentCode).then((rows) => pageOf(rows, page, size)),
    [assignmentId],
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const columns = useMemo(
    () => [
      {
        title: t('assignment.student'),
        key: 'student',
        // Review: 2026-10-18 — code/name enriched by course-service; departed students
        // keep nulls (id slice shown), same rule as the results view.
        render: (_: unknown, r: SubmissionResponse) =>
          r.studentCode || r.studentName ? (
            <div>
              <div>{r.studentCode ?? '—'}</div>
              <Typography.Text type="secondary">{r.studentName ?? ''}</Typography.Text>
            </div>
          ) : (
            <Typography.Text type="secondary">{r.studentId.slice(0, 8)}</Typography.Text>
          ),
      },
      { title: t('assignment.file'), dataIndex: 'zipFileName', key: 'zipFileName' },
      {
        title: t('assignment.status'),
        dataIndex: 'status',
        key: 'status',
        render: (v: string) => (
          <Tag color={v === 'PASSED' ? 'green' : v === 'FAILED' ? 'red' : 'default'}>{v}</Tag>
        ),
      },
      {
        title: t('assignment.latest'),
        dataIndex: 'latest',
        key: 'latest',
        render: (v: boolean | null) =>
          v ? <Tag color="blue">{t('assignment.latest')}</Tag> : '—',
      },
      {
        title: t('assignment.createdAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (v: string | null) => (v ? formatDateTime(v, i18n.language) : '—'),
      },
      {
        title: t('common.actions'),
        key: 'actions',
        width: 150,
        render: (_: unknown, r: SubmissionResponse) => (
          <Button
            type="link"
            size="small"
            onClick={() =>
              navigate(`/classes/${classId}/assignments/${assignmentId}/results?student=${r.studentId}`)
            }
          >
            {t('submission.viewResult')}
          </Button>
        ),
      },
    ],
    [t, i18n.language, classId, assignmentId, navigate],
  )

  const filterConfig: FilterConfig<SubmissionsFilters>[] = [
    {
      key: 'studentCode',
      type: 'select',
      label: t('assignment.filterStudent'),
      placeholder: t('assignment.filterStudentPlaceholder'),
      options: [
        { label: t('assignment.filterStudent'), value: '' },
        ...(studentOptions ?? []),
      ],
    },
  ]

  return (
    <ListPage<SubmissionResponse, SubmissionsFilters>
       fetcher={fetcher}
       filters={filterConfig}
       initialFilters={EMPTY_FILTERS}
       columns={columns}
       pageSize={20}
       rowKey="id"
       headerTitle={t('assignment.submissions')}
       headerActions={
         <Space>
           <Button onClick={() => navigate(-1)}>← {t('common.back')}</Button>
           <Button type="primary" onClick={() => setRefreshKey((k) => k + 1)}>
             {t('common.refresh')}
           </Button>
         </Space>
       }
       emptyTitle={t('assignment.noSubmissions')}
       emptyHint={undefined}
       showTotal={(total) => t('submission.total', { total })}
       refreshToken={refreshKey}
     />
  )
}
