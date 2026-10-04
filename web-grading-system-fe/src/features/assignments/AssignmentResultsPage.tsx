"use client"

import { Table, Tag, Spin, Empty, Typography, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useResults } from './useResults'
import { useParams } from 'react-router'
import type { StudentResultResponse } from '../../shared/types/assignment'

export function AssignmentResultsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data, isLoading, isError, error } = useResults(assignmentId ?? '', true)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button onClick={() => navigate(-1)}>← {t('common.back')}</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('assignment.results')}</Typography.Title>
      </div>
      {isLoading ? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} /> : null}
      {isError ? <Typography.Text type="danger">{String(error)}</Typography.Text> : null}
      {!isLoading && !isError && !data?.length ? <Empty description={t('assignment.noResults')} /> : null}
      {!isLoading && !isError && data?.length ? (
        <Table
          dataSource={data}
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
            expandedRowRender: (record: StudentResultResponse) => (
              <Table
                dataSource={record.results}
                columns={[
                  {
                    title: t('assignment.plan'),
                    dataIndex: 'planId',
                    key: 'planId',
                    render: (v: string) => v.slice(0, 8),
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
                  {
                    title: t('assignment.step'),
                    dataIndex: 'steps',
                    key: 'steps',
                    render: (steps: any[]) =>
                      steps?.map((s) => (
                        <Tag key={s.id} color={s.passed ? 'green' : 'red'}>
                          {s.stepName}: {s.passed ? t('assignment.passed') : t('assignment.failed')}
                        </Tag>
                      )) ?? '—',
                  },
                ]}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ),
          }}
        />
      ) : null}
    </div>
  )
}