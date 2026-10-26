import { Button, Typography, message, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { TableColumnsType } from 'antd'
import { useCallback, useState } from 'react'
import { ListPage } from '../../shared/ui/ListPage'
import type { FilterConfig } from '../../shared/ui/FilterBar'
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
} from '../../shared/api/endpoints/assignments'
import type { AssignmentResponse, GradingStrategy } from '../../shared/types/assignment'
import { CreateAssignmentModal } from '../assignments/CreateAssignmentModal'
import { EditAssignmentModal } from '../assignments/EditAssignmentModal'

export function PracticePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AssignmentResponse | null>(null)
  const [saving, setSaving] = useState(false)

  const refetch = () => setRefreshKey((k) => k + 1)

  const fetcher = useCallback(
    ({ page: p, size, search, topic }: { page: number; size: number; search?: string; topic?: string }) =>
      listAssignments({
        purpose: 'PRACTICE',
        topic,
        page: p,
        size,
        ...(search ? { search } : {}),
      }),
    [],
  )

  const filters: FilterConfig<{ search?: string; topic?: string }>[] = [
    { key: 'search', type: 'text', label: t('assignments.search'), placeholder: t('assignments.search'), submitOnEnter: true },
    { key: 'topic', type: 'text', label: t('assignment.topic'), placeholder: t('assignment.topicPlaceholder'), submitOnEnter: true },
  ]

  const columns: TableColumnsType<AssignmentResponse> = [
    {
      title: t('assignments.title'),
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Typography.Link style={{ overflowWrap: 'anywhere' }} onClick={() => navigate(`/practice/${record.id}`)}>
          {title}
        </Typography.Link>
      ),
    },
    {
      title: t('assignment.topic'),
      dataIndex: 'topic',
      key: 'topic',
      width: 150,
      render: (v: string) => <Tag color="blue">{v || '—'}</Tag>,
    },
    {
      title: t('assignment.status'),
      dataIndex: 'published',
      key: 'published',
      width: 150,
      render: (published: boolean) => (
        <Tag color={published ? 'green' : 'default'}>
          {published ? t('assignments.published') : t('assignments.unpublished')}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
          <Button size="small" onClick={() => navigate(`/practice/${record.id}`)}>
            {t('assignments.details')}
          </Button>
          {record.published ? (
            <>
              <Button type="link" size="small" onClick={() => navigate(`/practice/${record.id}/results`)}>
                {t('assignment.results')}
              </Button>
              <Button type="link" size="small" onClick={() => navigate(`/practice/${record.id}/submissions`)}>
                {t('assignment.submissions')}
              </Button>
              <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>
                {t('common.delete')}
              </Button>
            </>
          ) : (
            <Button type="link" size="small" onClick={() => handlePublish(record.id)}>
              {t('assignment.publish')}
            </Button>
          )}
          <Button type="link" size="small" onClick={() => setEditing(record)}>
            {t('common.edit')}
          </Button>
        </div>
      ),
    },
  ]

  const handleCreate = async (values: {
    ownerId: string
    title: string
    description?: string
    topic: string
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
      await createAssignment({ ...values, purpose: 'PRACTICE', topic: values.topic })
      message.success(t('assignment.created'))
      refetch()
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAssignment(id)
      message.success(t('assignment.deleted'))
      refetch()
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSaveEdit = async (req: { title?: string; description?: string; topic: string; gradingStrategy?: GradingStrategy }) => {
    if (!editing) return
    setSaving(true)
    try {
      await updateAssignment(editing.id, { ...req, topic: req.topic })
      message.success(t('assignment.updated'))
      setEditing(null)
      refetch()
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await publishAssignment(id)
      message.success(t('assignment.published'))
      refetch()
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('practice.title')}</Typography.Title>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          {t('practice.create')}
        </Button>
      </div>

      <ListPage<AssignmentResponse, { search?: string; topic?: string }>
        fetcher={fetcher}
        filters={filters}
        initialFilters={{ search: undefined, topic: undefined }}
        columns={columns}
        tableScrollX={960}
        rowKey="id"
        headerTitle={undefined}
        emptyTitle={t('practice.empty')}
        emptyHint={t('practice.emptyHint')}
        showTotal={(total) => t('assignments.total', { total })}
        refreshToken={refreshKey}
      />

      <CreateAssignmentModal
        open={modalOpen}
        ownerId=""
        purpose="PRACTICE"
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
    </div>
  )
}
