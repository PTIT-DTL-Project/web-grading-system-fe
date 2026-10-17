"use client"

import { Table, Tag, Spin, Empty, Typography, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router'
import { useResults } from './useResults'
import { useTestPlans } from './useTestPlans'
import { ResultScopeBadge } from '../../shared/ui/ResultScopeBadge'
import { LecturerStepEvidence } from './LecturerStepEvidence'
import { AiExplanationCard } from '../../shared/ui/AiExplanationCard'
import { useParams } from 'react-router'
import { useApiErrorMessage } from '../../shared/api/errors'
import type { AssignmentResultResponse, AssignmentResultStepResponse, StudentResultResponse } from '../../shared/types/assignment'

export function AssignmentResultsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { data, isLoading, isFetching, isError, error, refetch } = useResults(assignmentId ?? '', true)
  const { plans } = useTestPlans(assignmentId ?? '')
  const planName = (planId: string | null) => plans.find((p) => p.id === planId)?.name ?? null
  // Deep-link from the submissions table (?student=<userId>): narrow to that
  // student and expand their row on mount. Unknown ids simply match nothing.
  const [searchParams] = useSearchParams()
  const focusedStudent = searchParams.get('student')
  const visibleData = focusedStudent ? (data ?? []).filter((r) => r.studentUserId === focusedStudent) : (data ?? [])

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
        {
          title: t('result.score'),
          key: 'score',
          width: 100,
          render: (_: unknown, s: AssignmentResultStepResponse) =>
            s.score !== null && s.score !== undefined ? `${s.score}/${s.weight ?? '—'}` : '—',
        },
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
        expandedRowRender: (step: AssignmentResultStepResponse) => (
          <LecturerStepEvidence step={step} />
        ),
        rowExpandable: (step) =>
          !!(step.actualValue || step.expectedValue || step.errorMessage ||
             step.assertionDetails || step.extractedVars || step.requestUrl ||
             step.requestBody || step.responseStatus != null),
      }}
    />
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button onClick={() => navigate(-1)}>← {t('common.back')}</Button>
          <Button onClick={() => { void refetch() }} loading={isFetching}>
            {t('common.refresh')}
          </Button>
        </Space>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('assignment.results')}</Typography.Title>
      </div>
      {isLoading ? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} /> : null}
      {isError ? <Typography.Text type="danger">{toMessage(error)}</Typography.Text> : null}
      {!isLoading && !isError && !visibleData.length ? <Empty description={t('assignment.noResults')} /> : null}
      {!isLoading && !isError && visibleData.length ? (
        <Table
          dataSource={visibleData}
          columns={[
            {
              title: t('assignment.student'),
              key: 'student',
              render: (_: unknown, r: StudentResultResponse) => (
                <div>
                  <div>{r.studentCode}</div>
                  <Typography.Text type="secondary">{r.studentName}</Typography.Text>
                </div>
              ),
            },
            {
              title: t('assignment.score'),
              dataIndex: 'exerciseScore',
              key: 'exerciseScore',
              render: (v: number | null) => (v !== null ? v : '—'),
            },
          ]}
          rowKey="studentUserId"
          pagination={false}
          size="small"
          expandable={{
            expandedRowKeys: focusedStudent ? [focusedStudent] : undefined,
            expandedRowRender: (record: StudentResultResponse) => {
              // One explanation per student. The card used to hang off every inner
              // result row, so a student with several rows (a FULL run plus per-plan
              // runs) got the same comment repeated; it also needs a graded row to
              // explain, hence the guard for an empty result list.
              // result-service returns one row per plan scope with no ORDER BY, and a
              // PLAN run demotes only its own scope — so a student's rows can come from
              // different attempts; explain the most recent grading (completedAt desc),
              // not an index-0 guess that can shift between loads.
              const target = [...record.results]
                .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
              return (
                <>
                  {target ? (
                    <AiExplanationCard
                      submissionId={target.submissionId}
                      assignmentId={target.assignmentId}
                      enabled
                    />
                  ) : null}
                  <Table
                    dataSource={record.results}
                    columns={[
                      {
                        title: t('assignment.plan'),
                        dataIndex: 'planId',
                        key: 'planId',
                        // Real scope field when the mirror backend has deployed;
                        // planId-null fallback before that (backfilled convention).
                        render: (v: string | null | undefined, r: AssignmentResultResponse) => (
                          <ResultScopeBadge
                            scope={r.scope ?? (v === null || v === undefined ? 'FULL' : 'PLAN')}
                            planName={planName(v ?? null)}
                          />
                        ),
                      },
                      {
                        title: t('assignment.score'),
                        dataIndex: 'score',
                        key: 'score',
                        render: (v: number | null) => (v !== null ? v : '—'),
                      },
                      {
                        title: t('assignment.maxScore'),
                        dataIndex: 'maxScore',
                        key: 'maxScore',
                        render: (v: number | null) => (v !== null ? v : '—'),
                      },
                      {
                        title: t('assignment.status'),
                        dataIndex: 'status',
                        key: 'status',
                        render: (v: string) => (
                          <Tag color={v === 'PASSED' ? 'green' : v === 'FAILED' ? 'red' : 'default'}>
                            {v}
                          </Tag>
                        ),
                      },
                    ]}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    expandable={{
                      expandedRowRender: (result: AssignmentResultResponse) => (
                        stepTable(result.steps)
                      ),
                    }}
                  />
                </>
              )
            },
          }}
        />
      ) : null}
    </div>
  )
}