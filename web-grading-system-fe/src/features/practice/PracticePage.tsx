import { Button, Card, Result, Space, Spin, Typography, message, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import type { TableColumnsType } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { ListPage } from '../../shared/ui/ListPage'
import type { FilterConfig } from '../../shared/ui/FilterBar'
import { useApiErrorMessage } from '../../shared/api/errors'
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  getAssignment,
} from '../../shared/api/endpoints/assignments'
import type { AssignmentResponse } from '../../shared/types/assignment'
import { CreateAssignmentModal } from '../assignments/CreateAssignmentModal'
import { EditAssignmentModal } from '../assignments/EditAssignmentModal'
import { TestPlanEditor } from '../assignments/TestPlanEditor'

export function PracticePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()

  const [refreshKey, setRefreshKey] = useState(0)
  const { assignmentId } = useParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AssignmentResponse | null>(null)
  const [assignment, setAssignment] = useState<AssignmentResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<unknown>(null)
  const [detailKey, setDetailKey] = useState(0)
  const [saving, setSaving] = useState(false)

  const refetch = () => setRefreshKey((k) => k + 1)
  const reloadDetail = () => setDetailKey((k) => k + 1)

  // Review: 2026-10-27 — the detail route must stay on the detail screen even while the
  // fetch is in flight or failing. Gating it on `assignment` made the list view (and its
  // GET /assignments?purpose=PRACTICE request) flash on every click into /practice/:id.
  useEffect(() => {
    if (!assignmentId) {
      setAssignment(null)
      setDetailError(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    getAssignment(assignmentId)
      .then((a) => {
        if (!cancelled) setAssignment(a)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAssignment(null)
        setDetailError(err)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assignmentId, detailKey])

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

  const handleDelete = async (id: string): Promise<boolean> => {
    try {
      await deleteAssignment(id)
      message.success(t('assignment.deleted'))
      refetch()
      return true
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  const handleSaveEdit = async (req: { title?: string; description?: string; topic: string }) => {
    if (!editing) return
    setSaving(true)
    try {
      await updateAssignment(editing.id, { ...req, topic: req.topic })
      message.success(t('assignment.updated'))
      setEditing(null)
      refetch()
      if (assignmentId) reloadDetail()
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
      if (assignmentId) reloadDetail()
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeleteInDetail = async (id: string) => {
    // Only leave the detail screen once the delete actually succeeded.
    if (await handleDelete(id)) navigate('/practice')
  }

  // Shared by both views: the detail route can also open the edit modal, so it must be
  // rendered there too — previously it only existed in the list branch.
  const editModal = editing ? (
    <EditAssignmentModal
      key={editing.id}
      open
      record={editing}
      onSaved={() => { setEditing(null); refetch() }}
      onCancel={() => setEditing(null)}
      saving={saving}
      saveFn={handleSaveEdit}
    />
  ) : null

  // Detail view for a single assignment — keyed off the route param, never off the
  // fetch result, so a pending/failed request can never fall back to the list.
  if (assignmentId) {
    return (
      <div style={{ width: '100%', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {assignment?.title ?? t('assignments.details')}
          </Typography.Title>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => navigate('/practice')}>{t('assignments.back')}</Button>
            {assignment && (
              <>
                <Button type="primary" onClick={() => setEditing(assignment)}>{t('common.edit')}</Button>
                {assignment.published ? (
                  <Button type="link" danger onClick={() => handleDeleteInDetail(assignmentId)}>{t('common.delete')}</Button>
                ) : (
                  <Button type="link" onClick={() => handlePublish(assignmentId)}>{t('assignment.publish')}</Button>
                )}
              </>
            )}
          </div>
        </div>

        {detailLoading && !assignment ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : detailError ? (
          <Result
            status="error"
            title={t('assignments.detailLoadFailed')}
            subTitle={toMessage(detailError)}
            extra={
              <Space>
                <Button onClick={reloadDetail}>{t('common.retry')}</Button>
                <Button onClick={() => navigate('/practice')}>{t('assignments.back')}</Button>
              </Space>
            }
          />
        ) : !assignment ? (
          <Result
            status="404"
            title={t('assignments.notFound')}
            extra={<Button onClick={() => navigate('/practice')}>{t('assignments.back')}</Button>}
          />
        ) : (
          <>
            <Card title={t('assignments.details')} style={{ marginBottom: 16 }}>
              <Typography.Paragraph>{t('assignment.topic')}: {assignment.topic}</Typography.Paragraph>
              <Typography.Paragraph>{t('assignment.purpose')}: {assignment.purpose}</Typography.Paragraph>
              <Typography.Paragraph>
                {t('assignment.status')}: {assignment.published ? t('assignments.published') : t('assignments.unpublished')}
              </Typography.Paragraph>
            </Card>
            <Card title={t('assignment.description')} style={{ marginBottom: 16 }}>
              <Typography.Paragraph>{assignment.description || t('assignments.noDescription')}</Typography.Paragraph>
            </Card>
            <Card title={t('assignments.testPlans')}>
              <TestPlanEditor assignmentId={assignmentId} />
            </Card>
          </>
        )}
        {editModal}
      </div>
    )
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
      {editModal}
    </div>
  )
}
