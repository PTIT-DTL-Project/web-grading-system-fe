"use client"

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Drawer, Table, Button, Space, message, Tag, Select, Tooltip, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAssignments } from '../../assignments/useAssignments'
import { CreateAssignmentModal } from '../../assignments/CreateAssignmentModal'
import { EditAssignmentModal } from '../../assignments/EditAssignmentModal'
import { TestPlanEditor } from '../../assignments/TestPlanEditor'
import { useTopicOptions } from '../../assignments/useTopicOptions'
import { filterOptionByLabel } from '../../../shared/ui/selectSearch'
import { RowActions } from '../../../shared/ui/RowActions'
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
  // Topic is an exact-match server filter, so it must be chosen from the topics that
  // actually exist — a free-text box answered 0 rows for "quản lý" against
  // "quản lý sinh viên". The picker is type-to-filter (FilterBar matcher).
  // Review: 2026-11-12, lecturer report on this tab.
  const { options: topicOptions } = useTopicOptions({ role: 'LECTURER', purpose: 'GRADED', classId })
  // Review: 2026-10-05, Pullfrog — refresh classroom-wide mutations into this tab instead of leaving it stale.
  const { data, loading, error, refetch, create, update, remove, publish } = useAssignments({
    classId,
    purpose: 'GRADED',
    topic: topic || undefined,
    page,
    refreshToken,
  })
  const [modalOpen, setModalOpen] = useState(false)
  // Plans/steps open in a drawer, not in an expanded table row: the table scrolls
  // horizontally (scroll.x = 1420), and editing inside that scroll container made the
  // browser pan it whenever a field took focus, so every label looked clipped.
  // Review: 2026-11-21, user-reported "chọn là bị lệch".
  const [plansFor, setPlansFor] = useState<AssignmentResponse | null>(null)
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
      // Was width 440 for five inline links; the menu needs a single trigger cell.
      // Review: 2026-11-21, user request — actions moved behind a "..." menu.
      width: 110,
      align: 'center' as const,
      render: (_: unknown, record: AssignmentResponse) => (
        <RowActions
          disabled={pendingId === record.id}
          actions={[
            {
              key: 'plans',
              label: t('plan.title'),
              onClick: () => setPlansFor(record),
            },
            {
              key: 'results',
              label: t('assignment.results'),
              hidden: !record.published,
              onClick: () => navigate(`/classes/${classId}/assignments/${record.id}/results`),
            },
            {
              key: 'submissions',
              label: t('assignment.submissionList'),
              hidden: !record.published,
              onClick: () => navigate(`/classes/${classId}/assignments/${record.id}/submissions`),
            },
            {
              key: 'publish',
              label: t('assignment.publish'),
              hidden: record.published,
              disabled: archived,
              onClick: () => handlePublish(record.id),
            },
            {
              key: 'edit',
              label: t('common.edit'),
              disabled: archived,
              onClick: () => setEditing(record),
            },
            {
              key: 'delete',
              label: t('common.delete'),
              danger: true,
              disabled: archived,
              confirmTitle: t('common.confirmDelete'),
              onClick: () => handleDelete(record.id),
            },
          ]}
        />
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
        <Select
          placeholder={t('assignment.topicPlaceholder')}
          value={topic || undefined}
          onChange={(value) => {
            setTopic(value ?? '')
            // Filtering resets to the first page, otherwise a stale page index shows
            // an empty table for a topic that does have rows.
            setPage(0)
          }}
          options={topicOptions}
          showSearch
          optionFilterProp="label"
          filterOption={filterOptionByLabel}
          allowClear
          style={{ width: 260 }}
          aria-label={t('assignment.topic')}
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
          // The action column shrank 440 -> 110, so the fixed width is now the sum of
          // the declared widths (260+420+140+150+110); 1420 left a phantom scrollbar.
          // Review: 2026-11-21.
          tableLayout="fixed"
          scroll={{ x: 1080 }}
          loading={loading}
          pagination={data ? standardPagination({ meta: data.meta, currentPage: page, onPageChange: setPage }) : false}
          size="middle"
        />
      )}

      <Drawer
        open={!!plansFor}
        onClose={() => setPlansFor(null)}
        title={plansFor ? `${plansFor.title} — ${t('plan.title')}` : t('plan.title')}
        width="min(880px, 94vw)"
        destroyOnHidden
        styles={{ body: { paddingTop: 12 } }}
      >
        {/* Review: 2026-10-05, Pullfrog — archived classes must not stay editable through this editor. */}
        {plansFor && <TestPlanEditor assignmentId={plansFor.id} archived={archived} />}
      </Drawer>

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
