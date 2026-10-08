import { Button, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { listStudentClasses } from '../../shared/api/endpoints/studentClasses'
import { formatDateTime } from '../../shared/format/formatDateTime'
import type { ClassResponse, ClassStatus } from '../../shared/types/class'
import { colors } from '../../shared/theme/tokens'
import { ListPage } from '../../shared/ui/ListPage'
import { type FilterConfig } from '../../shared/ui/FilterBar'
import type { ListFilters } from '../../shared/hooks/useList'

interface FilterRule {
  field: 'name' | 'semester' | 'status'
  value: string
}

interface StudentClassesFilters extends ListFilters {
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

export function StudentClassesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<keyof ClassResponse>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('descend')

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
      render: (status: ClassStatus) => (
        <Tag color={status === 'ACTIVE' ? colors.success : colors.neutral}>
          {status === 'ACTIVE' ? t('classes.statusActive') : t('classes.statusArchived')}
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
      width: 120,
      align: 'right',
      render: (_value, row) => (
        <Button type="link" onClick={() => navigate(`/student/classes/${row.id}`)}>
          {t('classes.open')}
        </Button>
      ),
    },
  ], [t, i18n, navigate, sortField, sortOrder])

  const columnSorter = useMemo(() => ({
    status: (a: ClassResponse, b: ClassResponse) => {
      const order = ['ACTIVE', 'ARCHIVED']
      return order.indexOf(a.status) - order.indexOf(b.status)
    },
  }), [])

  const filterConfig: FilterConfig<StudentClassesFilters>[] = [
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
    <ListPage<ClassResponse, StudentClassesFilters>
      fetcher={(params) => {
        const search = serializeSearchRules(params.rules)
        const status = serializeStatus(params.rules)
        return listStudentClasses(params.page, params.size, search, status)
      }}
      filters={filterConfig}
      initialFilters={{ rules: [] }}
      columns={columns}
      pageSize={PAGE_SIZE}
      rowKey="id"
      headerTitle={t('classes.title')}
      emptyTitle={t('classes.empty')}
      emptyHint={t('classes.emptyHint')}
      showTotal={(total) => t('classes.total', { total })}
      sortField={sortField}
      sortOrder={sortOrder}
      onSortChange={(field, order) => {
        setSortField(field)
        setSortOrder(order ?? 'ascend')
      }}
      columnSorter={columnSorter}
    />
  )
}
