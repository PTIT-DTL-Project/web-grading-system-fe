import { PlusOutlined } from '@ant-design/icons'
import { App, Button, Popconfirm, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { archiveClass, listClasses } from '../../shared/api/endpoints/classes'
import { useApiErrorMessage } from '../../shared/api/errors'
import { formatDateTime } from '../../shared/format/formatDateTime'
import type { ClassResponse, ClassStatus } from '../../shared/types/class'
import { CreateClassModal } from './CreateClassModal'
import { ListPage } from '../../shared/ui/ListPage'
import { type FilterConfig } from '../../shared/ui/FilterBar'
import type { ListFilters } from '../../shared/hooks/useList'

interface FilterRule {
  field: 'name' | 'semester' | 'status'
  value: string
}

interface ClassesFilters extends ListFilters {
  rules: FilterRule[]
}

function serializeSearchRules(rules: FilterRule[] | undefined | null): string {
  const list = Array.isArray(rules) ? rules : []
  return list
    .filter((r) => (r.field === 'name' || r.field === 'semester') && r.value !== '' && r.value != null)
    .map((r) => `${r.field}:${r.value}`)
    .join(';')
}

function serializeStatus(rules: FilterRule[] | undefined | null): string | undefined {
  const list = Array.isArray(rules) ? rules : []
  const statusRule = list.find((r) => r.field === 'status' && r.value !== '' && r.value != null)
  return statusRule ? statusRule.value : undefined
}

const PAGE_SIZE = 20

export function ClassesPage() {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [sortField, setSortField] = useState<keyof ClassResponse>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend')

  const handleArchive = async (classId: string) => {
    try {
      await archiveClass(classId)
      message.success(t('classes.archived'))
      setRefreshToken((v) => v + 1)
    } catch (err) {
      message.error(toMessage(err))
    }
  }

  const columns = useMemo<TableColumnsType<ClassResponse>>(() => [
    {
      title: t('classes.name'),
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      sorter: true,
      sortOrder: sortField === 'name' ? sortOrder : null,
    },
    {
      title: t('classes.semester'),
      dataIndex: 'semester',
      key: 'semester',
      width: 110,
      align: 'center',
      sorter: true,
      sortOrder: sortField === 'semester' ? sortOrder : null,
    },
    {
      title: t('classes.status'),
      dataIndex: 'status',
      key: 'status',
      width: 150,
      sorter: true,
      sortOrder: sortField === 'status' ? sortOrder : null,
      render: (status: ClassStatus) =>
        status === 'ACTIVE' ? (
          <Tag style={{ color: '#FFFFFF', backgroundColor: '#23C181', border: 'none', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', fontWeight: 500 }}>
            {t('classes.statusActive')}
          </Tag>
        ) : (
          <Tag style={{ color: '#5A5A5A', backgroundColor: '#F5F5F5', border: 'none', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', fontWeight: 500 }}>
            {t('classes.statusArchived')}
          </Tag>
        ),
    },
    {
      title: t('classes.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
      sortOrder: sortField === 'createdAt' ? sortOrder : null,
      render: (createdAt: string | null) => formatDateTime(createdAt, i18n.language),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 170,
      align: 'right',
      render: (_value, row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
          <Button type="link" onClick={() => navigate(`/classes/${row.id}`)}>
            {t('classes.open')}
          </Button>
          {row.status === 'ACTIVE' && (
            <Popconfirm
              title={t('classes.confirmArchive')}
              okText={t('classes.archive')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={() => handleArchive(row.id)}
            >
              <Button type="link">{t('classes.archive')}</Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ], [t, i18n, navigate, sortField, sortOrder])

  const columnSorter = useMemo(() => ({
    status: (a: ClassResponse, b: ClassResponse) => {
      const order = ['ACTIVE', 'ARCHIVED']
      return order.indexOf(a.status) - order.indexOf(b.status)
    },
  }), [])

  const filterConfig: FilterConfig<ClassesFilters>[] = [
    {
      key: 'rules',
      type: 'builder',
      label: t('classes.filter'),
      fields: [
        { name: 'name', label: t('classes.name'), type: 'text' },
        { name: 'semester', label: t('classes.semester'), type: 'text' },
        {
          name: 'status',
          label: t('classes.status'),
          type: 'select',
          options: [
            { label: t('classes.all'), value: '' },
            { label: t('classes.statusActive'), value: 'ACTIVE' },
            { label: t('classes.statusArchived'), value: 'ARCHIVED' },
          ],
        },
      ],
    },
  ]

  return (
    <div>
      <ListPage<ClassResponse, ClassesFilters>
        fetcher={(params) => {
          const search = serializeSearchRules(params.rules)
          const status = serializeStatus(params.rules)
          return listClasses(params.page, params.size, search, status)
        }}
        filters={filterConfig}
        initialFilters={{ rules: [] }}
        columns={columns}
        pageSize={PAGE_SIZE}
        rowKey="id"
        headerTitle={t('classes.title')}
        headerActions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t('classes.create')}
          </Button>
        }
        emptyTitle={t('classes.empty')}
        emptyHint={t('classes.emptyHint')}
        showTotal={(total) => t('classes.total', { total })}
        refreshToken={refreshToken}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field)
          setSortOrder(order ?? 'ascend')
        }}
        columnSorter={columnSorter}
      />
      <CreateClassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setRefreshToken((v) => v + 1)}
      />
    </div>
  )
}
