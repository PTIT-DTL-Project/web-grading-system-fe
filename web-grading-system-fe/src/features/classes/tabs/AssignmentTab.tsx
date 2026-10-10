"use client"

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Table, Button, Space, Popconfirm, message, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAssignments } from '../../assignments/useAssignments'
import { CreateAssignmentModal } from '../../assignments/CreateAssignmentModal'
import { TestPlanEditor } from '../../assignments/TestPlanEditor'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { standardPagination } from '../../../shared/ui/StandardPagination'
import { colors } from '../../../shared/theme/tokens'
import type { AssignmentResponse } from '../../../shared/types/assignment'

interface AssignmentTabProps {
  classId: string
  ownerId: string
  archived?: boolean
  refreshToken?: number
  onSaved?: () => void
}

export function AssignmentTab({ classId, ownerId, archived = false, refreshToken = 0, onSaved }: AssignmentTabProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const [page, setPage] = useState(0)
  // Review: 2026-10-05, Pullfrog — refresh classroom-wide mutations into this tab instead of leaving it stale.
  const { data, loading, error, refetch, create, remove, publish } = useAssignments(classId, refreshToken, page)
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
      onSaved?.()
    } catch (err: unknown) {
      // Review: 2026-10-05, Pullfrog — rethrow so the modal can keep user input when creation fails.
      message.error(toMessage(err))
      throw err
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
        v === 'STUDENT_DOCKER_COMPOSE' ? t('assignment.strategyStudent') : t('assignment.strategyLecturer'),
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
      // Pinned to the system timezone like formatDateTime (2026-10-10).
      render: (v: string) =>
        v
          ? new Date(v).toLocaleDateString(i18n.language, { timeZone: 'Asia/Ho_Chi_Minh' })
          : '—',
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
          pagination={data ? standardPagination({ meta: data.meta, currentPage: page, onPageChange: setPage }) : false}
          size="middle"
          expandable={{
            expandedRowRender: (record) => (
              // Review: 2026-10-05, Pullfrog — archived classes must not stay editable through the expanded plan editor.
              <TestPlanEditor assignmentId={record.id} archived={archived} />
            ),
            rowExpandable: () => true,
          }}
        />
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