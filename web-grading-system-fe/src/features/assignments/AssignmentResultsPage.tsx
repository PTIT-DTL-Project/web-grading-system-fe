"use client"

import { Table, Tag, Spin, Empty, Typography, Button, Space, Alert } from 'antd'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useList } from '../../shared/hooks/useList'
import { FilterBar } from '../../shared/ui/FilterBar'
import { standardPagination } from '../../shared/ui/StandardPagination'
import { ErrorState } from '../../shared/ui/ErrorState'
import { useTestPlans } from './useTestPlans'
import { useAssignmentStudents } from './useAssignmentStudents'
import { listResults, getAssignment } from '../../shared/api/endpoints/assignments'
import { ResultScopeBadge } from '../../shared/ui/ResultScopeBadge'
import { LecturerStepEvidence } from './LecturerStepEvidence'
import { AiExplanationCard } from '../../shared/ui/AiExplanationCard'
import { SubmissionDetailCard } from './SubmissionDetailCard'
import type { FilterConfig } from '../../shared/ui/FilterBar'
import type { AssignmentResultResponse, AssignmentResultStepResponse, StudentResultResponse } from '../../shared/types/assignment'

import { useApiErrorMessage } from '../../shared/api/errors'
import { useQuery } from '@tanstack/react-query'

interface ResultsFilters {
  studentCode?: string
}

const EMPTY_FILTERS: ResultsFilters = { studentCode: '' }

export function AssignmentResultsPage() {
  const { classId, assignmentId } = useParams<{ classId?: string; assignmentId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  // Bài tập luyện tập (classId undefined) không có roster lớp → ẩn bộ lọc sinh viên.
  const isPractice = !classId
  const base = isPractice ? `/practice/${assignmentId}` : `/classes/${classId}/assignments/${assignmentId}`
  // Deep-link from the submissions table (?student=<userId>&submission=<id>):
  // narrows fetched rows to that student and pre-expands the submission evidence.
  // Client-side only; the dropdown filter below is the server-side (?studentCode=) path.
  const focusedStudent = searchParams.get('student') ?? null
  const focusedSubmission = searchParams.get('submission') ?? null

  const { plans } = useTestPlans(assignmentId ?? '')
  const planName = (planId: string | null) => plans.find((p) => p.id === planId)?.name ?? null

  // REVIEW: 2026-10-21 — fetch assignment title via lecturer-scoped endpoint so the
  // deep-link card doesn't hit the student-only GET /api/v1/student/assignments/{id}.
  // REVIEW: 2026-10-21, Pullfrog — only needed for the focusedSubmission branch, so gate
  // the fetch there to avoid a network call on the normal class-table view.
  const { data: assignment } = useQuery({
    queryKey: ['assignment', assignmentId, focusedSubmission],
    queryFn: () => getAssignment(assignmentId ?? ''),
    enabled: !!assignmentId && !!focusedSubmission,
    staleTime: 10 * 60 * 1000,
  })

  const { data: studentOptions } = useAssignmentStudents(classId ?? '')

  const {
    rows,
    meta,
    loading,
    error,
    reload,
    page,
    setPage,
    filters,
    setFilter,
    resetFilters,
  } = useList<StudentResultResponse, ResultsFilters>({
    fetcher: useCallback(
      // REVIEW: 2026-10-21 — when deep-linking via ?submission=<id>, we render
      // SubmissionDetailCard and bypass the class table entirely. Short-circuit
      // to an empty page so listResults (a full-class fetch) is never called.
      ({ page, size, studentCode }) => {
        if (focusedSubmission) {
          return Promise.resolve({
            result: [] as StudentResultResponse[],
            meta: { page: 0, pageSize: 0, pages: 0, total: 0 },
          })
        }
        return listResults(
          assignmentId ?? '',
          true,
          // Deep-link path: fetch the whole class (no page/size => server returns full list)
          // so a student not on page 1 is still visible, then filter client-side.
          focusedStudent ? undefined : studentCode,
          focusedStudent ? undefined : page,
          focusedStudent ? undefined : size,
        )
      },
      [assignmentId, focusedStudent, focusedSubmission],
    ),
    filters: EMPTY_FILTERS,
    pageSize: 20,
  })

  // Overlay the deep-link userId filter on the fetched rows.
  const visibleRows = focusedStudent ? rows.filter((r) => r.studentUserId === focusedStudent) : rows

  const toMessage = useApiErrorMessage()
  const errMsg = error ? toMessage(error) : null

  const stepTable = (steps: AssignmentResultStepResponse[] | null | undefined) => (
    <Table
      dataSource={steps ?? []}
      columns={[
        { title: t('result.stepName'), dataIndex: 'stepName', key: 'stepName' },
        { title: t('result.stepType'), dataIndex: 'stepType', key: 'stepType', width: 120 },
        {
          title: t('result.passed'),
          dataIndex: 'passed',
          key: 'passed',
          width: 90,
          // Review: 2026-10-05, Pullfrog — null means no verdict yet, not a failure.
          render: (passed: boolean | null, s: AssignmentResultStepResponse) =>
            s.skipped ? (
              <Tag>{t('result.skipped')}</Tag>
            ) : passed === null ? (
              <Tag>{t('assignment.pending')}</Tag>
            ) : passed ? (
              <Tag color="green">{t('assignment.passed')}</Tag>
            ) : (
              <Tag color="red">{t('assignment.failed')}</Tag>
            ),
          },
           { title: t('result.score'), key: 'score', width: 100, render: (_: unknown, s: AssignmentResultStepResponse) => (s.score != null ? `${s.score}/${s.weight ?? '—'}` : '—') },
          {
            title: t('result.durationMs'),
            dataIndex: 'durationMs',
            key: 'durationMs',
            width: 120,
            render: (v: number | null) => (v != null ? `${v} ms` : '—'),
          },
      ]}
      rowKey="id"
      pagination={false}
      size="small"
      expandable={{
        expandedRowRender: (step: AssignmentResultStepResponse) => <LecturerStepEvidence step={step} />,
        rowExpandable: (step) =>
          !!(step.actualValue || step.expectedValue || step.errorMessage ||
             step.assertionDetails || step.extractedVars || step.requestUrl ||
             step.requestBody || step.responseStatus != null),
      }}
    />
  )

  const columns = [
    {
      title: t('assignment.student'),
      key: 'student',
      render: (_: unknown, r: StudentResultResponse) => (
        <div>
          <div>{r.studentCode ?? r.studentUserId.slice(0, 8)}</div>
          <Typography.Text type="secondary">{r.studentName ?? ''}</Typography.Text>
        </div>
      ),
    },
    {
      title: t('assignment.score'),
      dataIndex: 'exerciseScore',
      key: 'exerciseScore',
      render: (v: number | null) => (v !== null ? v : '—'),
    },
  ]

  const filterConfig: FilterConfig<ResultsFilters>[] = isPractice
    ? []
    : [
      {
        key: 'studentCode',
        type: 'select',
        label: t('assignment.filterStudent'),
        placeholder: t('assignment.filterStudentPlaceholder'),
        options: [{ label: t('assignment.filterStudent'), value: '' }, ...(studentOptions ?? [])],
      },
    ]

  // REVIEW: 2026-10-21, lecturer single-submission deep-link — when the grader
  // clicks "Xem kết quả" from the submissions table, render the same detail
  // card as the student view (flat result + AI explanation) rather than the
  // class-aggregation table. (tại vì phần điểm là có show cái đó rồi mà)
  // Rendered as conditional JSX at the return point so rules-of-hooks stays
  // valid — all data hooks above run unconditionally, this only swaps the JSX.
  if (focusedSubmission) {
    return (
      <SubmissionDetailCard
        submissionId={focusedSubmission}
        assignmentId={assignmentId}
        onBack={() => navigate(`${base}/submissions`)}
         backLabelKey="assignment.submissions"
         planName={planName}
         title={assignment?.title}
       />
    )
  }

  if (loading && !rows.length) {
    return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button onClick={() => navigate(-1)}>← {t('common.back')}</Button>
          <Button onClick={() => reload()} loading={loading}>
            {t('common.refresh')}
          </Button>
        </Space>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('assignment.results')}</Typography.Title>
      </div>

      <FilterBar
        filters={filters}
        config={filterConfig}
        onFilterChange={setFilter}
        onSubmit={reload}
        onClear={resetFilters}
        showActions
      />

      {error && rows.length > 0 ? (
        // Stale-rows case: keep showing the previous page while flagging the failed reload.
        <Alert
          type="error"
          showIcon
          title={errMsg}
          action={
            <Button type="primary" onClick={reload} style={{ marginRight: 0 }}>
              {t('common.retry')}
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {error && !rows.length ? (
        <ErrorState message={errMsg ?? 'Something went wrong'} onRetry={reload} />
      ) : null}

      {!loading && !error && !visibleRows.length ? (
        <Empty description={focusedStudent ? t('assignment.noStudentResults') : t('assignment.noResults')} />
      ) : null}

      <Table<StudentResultResponse>
        dataSource={visibleRows}
        columns={columns}
        rowKey="studentUserId"
        loading={loading}
        onChange={() => {}}
        pagination={
          focusedStudent
            ? false
            : standardPagination({
                meta,
                currentPage: page,
                onPageChange: setPage,
                showTotal: (total) => t('students.total', { total }),
              })
        }
        expandable={{
          expandedRowKeys: focusedStudent ? [focusedStudent] : undefined,
          expandedRowRender: (record: StudentResultResponse) => {
            // One explanation per student. The card used to hang off every inner
            // result row, so a student with several rows (a FULL run plus per-plan
            // runs) got the same comment repeated; it also needs a graded row to
            // explain, hence the guard for an empty result list.
            // result-service returns one row per plan scope with no ORDER BY, and a
            // PLAN run demotes only its own scope — so a student's rows can come
            // from different attempts; explain the most recent grading (completedAt
            // desc), not an index-0 guess that can shift between loads.
            const target = [...record.results]
              .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
            return (
              <>
                {target ? (
                  <div id={`submission-${target.submissionId}`}>
                    <AiExplanationCard
                      submissionId={target.submissionId}
                      assignmentId={target.assignmentId}
                      enabled
                    />
                  </div>
                ) : null}
                <Table
                  dataSource={record.results}
                  columns={[
                    {
                      title: t('assignment.plan'),
                      dataIndex: 'planId',
                      key: 'planId',
                      render: (_: unknown, r: AssignmentResultResponse) => (
                        <ResultScopeBadge
                          scope={r.scope ?? (r.planId === null || r.planId === undefined ? 'FULL' : 'PLAN')}
                          planName={planName(r.planId ?? null)}
                        />
                      ),
                    },
                    { title: t('assignment.score'), dataIndex: 'score', key: 'score', render: (v: number | null) => (v !== null ? v : '—') },
                    { title: t('assignment.maxScore'), dataIndex: 'maxScore', key: 'maxScore', render: (v: number | null) => (v !== null ? v : '—') },
                    {
                      title: t('assignment.status'),
                      dataIndex: 'status',
                      key: 'status',
                      render: (v: string) => (
                        <Tag color={v === 'PASSED' ? 'green' : v === 'FAILED' ? 'red' : 'default'}>{v}</Tag>
                      ),
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  expandable={{
                    expandedRowRender: (result: AssignmentResultResponse) => stepTable(result.steps),
                  }}
                />
              </>
            )
          },
        }}
      />
    </div>
  )
}
