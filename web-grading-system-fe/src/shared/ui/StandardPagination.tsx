import type { PaginationProps } from 'antd'

export interface StandardPaginationProps {
  meta: {
    page: number
    pageSize: number
    total: number
  }
  currentPage: number
  onPageChange: (page: number) => void
  showTotal?: (total: number) => React.ReactNode
}

export function standardPagination({
  meta,
  currentPage,
  onPageChange,
  showTotal,
}: StandardPaginationProps): PaginationProps {
  return {
    current: currentPage + 1,
    pageSize: meta.pageSize,
    total: meta.total,
    showSizeChanger: false,
    showTotal: showTotal ? (total) => showTotal(total) : undefined,
    onChange: (nextPage) => onPageChange(nextPage - 1),
  }
}
