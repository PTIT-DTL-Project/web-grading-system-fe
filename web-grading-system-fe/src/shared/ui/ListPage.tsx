import { Alert, Button, Empty, Table, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import type { ListFilters } from '../hooks/useList'
import { useList } from '../hooks/useList'
import { FilterBar, type FilterConfig } from './FilterBar'
import { standardPagination } from './StandardPagination'
import { ErrorState } from './ErrorState'

export interface ListPageProps<T, F extends ListFilters> {
  fetcher: (params: { page: number; size: number } & F) => Promise<{ meta: { page: number; pageSize: number; pages: number; total: number }; result: T[] }>
  filters: FilterConfig<F>[]
  initialFilters: F
  columns: TableColumnsType<T>
  pageSize?: number
  rowKey: keyof T | ((row: T) => string)
  headerTitle?: string
  headerActions?: React.ReactNode
  emptyTitle?: string
  emptyHint?: string
  showTotal?: (total: number) => React.ReactNode
  onRefresh?: () => void
  refreshToken?: number
  sortField?: keyof T
  sortOrder?: 'ascend' | 'descend'
  onSortChange?: (field: keyof T, order: 'ascend' | 'descend' | null) => void
  columnSorter?: Record<string, (a: T, b: T) => number>
}

export function ListPage<T, F extends ListFilters>({
  fetcher,
  filters,
  initialFilters,
  columns,
  pageSize = 20,
  rowKey,
  headerTitle,
  headerActions,
  emptyTitle,
  emptyHint,
  showTotal,
  onRefresh,
  refreshToken,
  sortField,
  sortOrder,
  onSortChange,
  columnSorter,
}: ListPageProps<T, F>) {
  const { t } = useTranslation()
  const hasSubmitMode = filters.some((f) => f.submitOnEnter || f.type === 'builder')
  const { rows, meta, loading, error, reload, page, setPage, filters: activeFilters, setFilter, submitFilters, resetFilters } =
    useList<T, F>({
      fetcher,
      filters: initialFilters,
      pageSize,
      refreshToken,
      submitOnEnter: hasSubmitMode,
    })

  const [localSortField, setLocalSortField] = useState<keyof T | undefined>(sortField)
  const [localSortOrder, setLocalSortOrder] = useState<'ascend' | 'descend' | undefined>(sortOrder)

  const effectiveSortField = localSortField ?? sortField
  const effectiveSortOrder = localSortOrder ?? sortOrder

  const sortedRows = useMemo(() => {
    if (!effectiveSortField || !effectiveSortOrder) return rows
    const comparator = columnSorter?.[String(effectiveSortField)]
    if (comparator) {
      return [...rows].sort(comparator)
    }
    return [...rows].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[String(effectiveSortField)]
      const bVal = (b as Record<string, unknown>)[String(effectiveSortField)]
      if (aVal === bVal) return 0
      const isAsc = effectiveSortOrder === 'ascend'
      if (aVal == null) return isAsc ? -1 : 1
      if (bVal == null) return isAsc ? 1 : -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return isAsc ? aVal - bVal : bVal - aVal
      }
      return 0
    })
  }, [rows, effectiveSortField, effectiveSortOrder, columnSorter])

  const handleTableChange = (_pagination: unknown, _filters: unknown, sorter: unknown) => {
    const sorterResult = Array.isArray(sorter) ? sorter[0] : (sorter as { field?: keyof T; order?: 'ascend' | 'descend' | null } | undefined)
    const nextField = sorterResult?.field ?? sortField
    const nextOrder = sorterResult?.order ?? null
    setLocalSortField(nextField)
    setLocalSortOrder(nextOrder ?? undefined)
    if (nextField && nextOrder) {
      setPage(0)
    }
    onSortChange?.(nextField, nextOrder ?? null)
  }

  const handleRetry = () => {
    reload()
    onRefresh?.()
  }

  const showErrorFirst = Boolean(error) && rows.length === 0
  const showEmpty = !error && rows.length === 0 && !loading

  return (
    <div>
      {(headerTitle || headerActions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          {headerTitle && (
            <Typography.Title level={4} style={{ margin: 0 }}>
              {headerTitle}
            </Typography.Title>
          )}
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}

      <FilterBar
        filters={activeFilters}
        onFilterChange={setFilter}
        config={filters}
        onSubmit={hasSubmitMode ? submitFilters : undefined}
        onClear={hasSubmitMode ? resetFilters : undefined}
        showActions={hasSubmitMode}
      />

      {showErrorFirst ? (
        <ErrorState
          title={emptyTitle}
          message={error instanceof Error ? error.message : String(error)}
          onRetry={handleRetry}
        />
      ) : showEmpty ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Empty
            description={
              <div>
                <div>{emptyTitle}</div>
                {emptyHint && <div style={{ fontSize: 13, opacity: 0.65 }}>{emptyHint}</div>}
              </div>
            }
          />
        </div>
      ) : (
        <>
          {error && rows.length > 0 && (
            <Alert
              type="error"
              showIcon
              title={error instanceof Error ? error.message : String(error)}
              action={
                <Button onClick={handleRetry} style={{ marginRight: 0 }}>
                  {t('common.retry')}
                </Button>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          <Table<T>
            rowKey={typeof rowKey === 'function' ? rowKey : (rowKey as string)}
            columns={columns}
            dataSource={sortedRows}
            loading={loading}
            onChange={handleTableChange}
            pagination={standardPagination({
              meta,
              currentPage: page,
              onPageChange: setPage,
              showTotal,
            })}
          />
        </>
      )}
    </div>
  )
}
