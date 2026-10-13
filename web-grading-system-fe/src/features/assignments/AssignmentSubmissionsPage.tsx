"use client"

import { useParams } from 'react-router'
import { Table, Tag, Spin, Empty, Typography, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useSubmissions } from './useSubmissions'
import { useApiErrorMessage } from '../../shared/api/errors'
import type { SubmissionResponse } from '../../shared/types/assignment'
import { formatDateTime } from '../../shared/format/formatDateTime'

export function AssignmentSubmissionsPage() {
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const toMessage = useApiErrorMessage()
  const { data, isLoading, isFetching, isError, error, refetch } = useSubmissions(assignmentId ?? '')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button onClick={() => navigate(-1)}>← {t('common.back')}</Button>
          <Button onClick={() => { void refetch() }} loading={isFetching}>
            {t('common.refresh')}
          </Button>
        </Space>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('assignment.submissions')}</Typography.Title>
      </div>
      {isLoading ? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} /> : null}
      {isError ? <Typography.Text type="danger">{toMessage(error)}</Typography.Text> : null}
      {!isLoading && !isError && !data?.length ? <Empty description={t('assignment.noSubmissions')} /> : null}
      {!isLoading && !isError && data?.length ? (
        <Table
          dataSource={data}
          columns={[
            {
              title: t('assignment.student'),
              key: 'student',
              // Review: 2026-10-10 — code/name enriched by course-service;
              // departed students keep nulls, fall back to the raw id slice.
              render: (_: unknown, r: SubmissionResponse) => (
                r.studentCode || r.studentName ? (
                  <div>
                    <div>{r.studentCode ?? '—'}</div>
                    <Typography.Text type="secondary">{r.studentName ?? ''}</Typography.Text>
                  </div>
                ) : (
                  <Typography.Text type="secondary">{r.studentId.slice(0, 8)}</Typography.Text>
                )
              ),
            },
            {
              title: t('assignment.file'),
              dataIndex: 'zipFileName',
              key: 'zipFileName',
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
              title: t('assignment.latest'),
              dataIndex: 'latest',
              key: 'latest',
              render: (v: boolean | null) => (v ? <Tag color="blue">{t('assignment.latest')}</Tag> : '—'),
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
              // Review: 2026-10-12 — deep-link into the results view filtered
              // to this student (auto-expanded there); lecturer drill-down
              // without losing the submission context.
              render: (_: unknown, r: SubmissionResponse) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    navigate(
                      `/classes/${classId}/assignments/${assignmentId}/results?student=${r.studentId}`,
                    )
                  }
                >
                  {t('submission.viewResult')}
                </Button>
              ),
            },
          ]}
          rowKey="id"
          pagination={false}
          size="small"
        />
      ) : null}
    </div>
  )
}