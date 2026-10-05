"use client"

import { useParams } from 'react-router'
import { Table, Tag, Spin, Empty, Typography, Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useSubmissions } from './useSubmissions'
import { useApiErrorMessage } from '../../shared/api/errors'

export function AssignmentSubmissionsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
              dataIndex: 'studentId',
              key: 'studentId',
              render: (v: string) => v.slice(0, 8),
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
              render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
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