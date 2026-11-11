"use client"

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Table, Button, Space, Popconfirm, message, Tag, Input, Tooltip, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAssignments } from '../../assignments/useAssignments'
import { CreateAssignmentModal } from '../../assignments/CreateAssignmentModal'
import { EditAssignmentModal } from '../../assignments/EditAssignmentModal'
import { TestPlanEditor } from '../../assignments/TestPlanEditor'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { standardPagination } from '../../../shared/ui/StandardPagination'
import { colors } from '../../../shared/theme/tokens'
import type { AssignmentResponse, UpdateAssignmentRequest } from '../../../shared/types/assignment'

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
  const [topic, setTopic] = useState<string>('')
  // Review: 2026-10-05, Pullfrog — refresh classroom-wide mutations into this tab instead of leaving it stale.
  const { data, loading, error, refetch, create, update, remove, publish } = useAssignments({
    classId,
    purpose: 'GRADED',
    topic: topic || undefined,
    page,
    refreshToken,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AssignmentResponse | null>(null)
  const [saving, setSaving] = useState(false)
  // Review: 2026-11-11, Pullfrog — track per-row async state so the action
  // buttons disable while a delete/publish is in flight (prevents duplicate
  // requests when users double-click).
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleCreate = async (values: {
    title: string
    description?: string
    dockerComposePort?: number
    startupTimeoutMs?: number
    executionTimeoutMs?: number
    maxMemoryMb?: number
    maxCpu?: number
    topic: string
  }) => {
    setCreating(true)
    try {
      await create({ ...values, classId, ownerId, purpose: 'GRADED' })
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
    setPendingId(id)
    try {
      await remove(id)
      message.success(t('assignment.deleted'))
      onSaved?.()
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setPendingId(null)
    }
  }

  const handleSaveEdit = async (req: UpdateAssignmentRequest) => {
    if (!editing) return
    setSaving(true)
    try {
      await update(editing.id, req)
      message.success(t('assignment.updated'))
      setEditing(null)
      onSaved?.()
    } catch (err: unknown) {
      message.error(toMessage(err))
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (id: string) => {
    setPendingId(id)
    try {
      await publish(id)
      message.success(t('assignment.published'))
      onSaved?.()
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setPendingId(null)
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
      width: 260,
      render: (v: string) => (
        <Tooltip title={v}>
          <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, overflowWrap: 'anywhere' }}>
            <strong>{v}</strong>
          </Typography.Paragraph>
        </Tooltip>
      ),
    },
    {
      title: t('assignment.topic'),
      dataIndex: 'topic',
      key: 'topic',
      width: 420,
      // UI review: 2026-11-11, user-reported lecturer table layout — bound long topics so action columns remain visible and aligned.
      render: (v: string) => (
        <Tooltip title={v || '—'}>
          <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, overflowWrap: 'anywhere' }}>
            {v || '—'}
          </Typography.Paragraph>
        </Tooltip>
      ),
    },
    {
      title: t('assignment.status'),
      dataIndex: 'published',
      key: 'published',
      width: 140,
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
      width: 150,
      // Pinned to the system timezone like formatDateTime (2026-10-10).
      render: (v: string) =>
        v
          ? new Date(v).toLocaleDateString(i18n.language, { timeZone: 'Asia/Ho_Chi_Minh' })
          : '—',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 440,
      render: (_: unknown, record: AssignmentResponse) => (
        <Space size={8} wrap={false}>
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
            <Button type="link" size="small" disabled={archived} loading={pendingId === record.id} onClick={() => handlePublish(record.id)}>
              {t('assignment.publish')}
            </Button>
          )}
          <Popconfirm
            title={t('common.confirmDelete')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger size="small" disabled={archived} loading={pendingId === record.id}>
              {t('common.delete')}
            </Button>
          </Popconfirm>
          <Button type="link" size="small" disabled={archived} onClick={() => setEditing(record)}>
            {t('common.edit')}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" onClick={() => setModalOpen(true)} disabled={archived}>
          {t('assignment.create')}
        </Button>
        <Button onClick={refetch} disabled={loading || archived} icon={<ReloadOutlined />} title={t('common.refresh')} aria-label={t('common.refresh')}>
          {t('common.refresh')}
        </Button>
        <Input
          placeholder={t('assignment.topicPlaceholder')}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onPressEnter={() => refetch()}
          style={{ width: 240 }}
        />
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
          // UI review: 2026-11-11, user-reported lecturer table layout — use fixed columns and horizontal scrolling instead of crushing the title column.
          tableLayout="fixed"
          scroll={{ x: 1420 }}
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
      {editing && (
        <EditAssignmentModal
          key={editing.id}
          open
          record={editing}
          onSaved={() => { setEditing(null); refetch() }}
          onCancel={() => setEditing(null)}
          saving={saving}
          saveFn={handleSaveEdit}
        />
      )}
    </Space>
  )
}
