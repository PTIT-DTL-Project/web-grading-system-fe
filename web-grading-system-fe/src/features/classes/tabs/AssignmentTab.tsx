"use client"

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAssignments } from '../../assignments/useAssignments'
import { CreateAssignmentModal } from '../../assignments/CreateAssignmentModal'
import { TestPlanEditor } from '../../assignments/TestPlanEditor'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import type { AssignmentResponse } from '../../../shared/types/assignment'

interface AssignmentTabProps {
  classId: string
  ownerId: string
  archived?: boolean
  refreshToken?: number
  onSaved?: () => void
}

export function AssignmentTab({ classId, ownerId, archived = false, onSaved }: AssignmentTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const [page, setPage] = useState(0)
  const { data, loading, error, refetch, create, remove, publish } = useAssignments(classId)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleCreate = async (values: {
    title: string
    description?: string
    gradingStrategy: 'STUDENT_DOCKER_COMPOSE' | 'LECTURER_DOCKER_COMPOSE'
    dockerComposeTemplate?: string
    dockerComposePort?: number
    startupTimeoutMs?: number
    executionTimeoutMs?: number
    maxMemoryMb?: number
    maxCpu?: number
  }) => {
    setCreating(true)
    try {
      await create({ ...values, classId, ownerId })
      message.success(t('assignment.created'))
      setModalOpen(false)
      onSaved?.()
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      message.success(t('assignment.deleted'))
      onSaved?.()
    } catch (err: unknown) {
      message.error(toMessage(err))
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await publish(id)
      message.success(t('assignment.published'))
      onSaved?.()
    } catch (err: unknown) {
      message.error(toMessage(err))
    }
  }

  const errorMessage = error ? (toMessage(error) as string) : ''
  const hasError = Boolean(error)

  const dataSource = data?.result ?? []

  const columns = [
    {
      title: t('assignment.title'),
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('assignment.strategy'),
      dataIndex: 'gradingStrategy',
      key: 'gradingStrategy',
      render: (v: string) =>
        v === 'STUDENT_DOCKER_COMPOSE' ? 'Student Docker' : 'Lecturer Docker',
    },
    {
      title: t('assignment.status'),
      dataIndex: 'published',
      key: 'published',
      render: (v: boolean) => (
        v ? (
          <Tag color="green">{t('assignment.statusPublished')}</Tag>
        ) : (
          <Tag>{t('assignment.statusDraft')}</Tag>
        )
      ),
    },
    {
      title: t('assignment.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, record: AssignmentResponse) => (
        <Space size={8}>
          {record.published && (
            <>
              <Button type="link" size="small" onClick={() => navigate(`/classes/${classId}/assignments/${record.id}/results`)}>
                {t('assignment.results')}
              </Button>
              <Button type="link" size="small" onClick={() => navigate(`/classes/${classId}/assignments/${record.id}/submissions`)}>
                {t('assignment.submissions')}
              </Button>
            </>
          )}
          {!record.published && (
            <Button type="link" size="small" disabled={archived} onClick={() => handlePublish(record.id)}>
              {t('assignment.publish')}
            </Button>
          )}
          <Popconfirm title={t('common.delete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" disabled={archived}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button type="primary" onClick={() => setModalOpen(true)} disabled={archived}>
          {t('assignment.create')}
        </Button>
      </div>

      {hasError && dataSource.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <span style={{ color: colors.error }}>{errorMessage}</span>
        </div>
      )}

      {!hasError && dataSource.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 48, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <Space direction="vertical" size={8}>
            <span style={{ color: colors.neutral }}>{t('assignment.empty')}</span>
            <Button type="primary" onClick={() => setModalOpen(true)} disabled={archived}>
              {t('assignment.create')}
            </Button>
          </Space>
        </div>
      )}

      {dataSource.length > 0 && (
        <Table<AssignmentResponse>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
          size="middle"
          expandable={{
            expandedRowRender: (record) => (
              <TestPlanEditor assignmentId={record.id} />
            ),
            rowExpandable: () => true,
          }}
        />
      )}

      {data && data.meta.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <Space>
            <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <span>{page + 1} / {data.meta.pages}</span>
            <Button disabled={page >= data.meta.pages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </Space>
        </div>
      )}

      <CreateAssignmentModal
        open={modalOpen}
        classId={classId}
        ownerId={ownerId}
        onCreated={() => { setModalOpen(false); refetch() }}
        onCancel={() => setModalOpen(false)}
        creating={creating}
        createFn={handleCreate}
      />
    </Space>
  )
}