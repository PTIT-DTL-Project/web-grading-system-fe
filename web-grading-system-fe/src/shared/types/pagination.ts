/**
 * Paged body: `data = { meta, result }` (ResultPaginationDTO.from(Page)).
 * `meta.page` is 0-based — antd Table's `current` is 1-based, so add 1.
 */
export interface PageMeta {
  page: number
  pageSize: number
  pages: number
  total: number
}

export interface Page<T> {
  meta: PageMeta
  result: T[]
}
