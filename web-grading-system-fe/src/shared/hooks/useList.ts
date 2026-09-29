import { isCancel } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page, PageMeta } from '../types/pagination'

export interface ListFilters {}

export interface UseListParams<T, F extends ListFilters> {
  fetcher: (params: { page: number; size: number } & F) => Promise<Page<T>>
  filters: F
  pageSize?: number
  debounceMs?: number
  persistFilters?: boolean
  refreshToken?: number
  submitOnEnter?: boolean
}

export interface UseListResult<T, F extends ListFilters> {
  rows: T[]
  meta: PageMeta
  loading: boolean
  error: unknown
  reload: () => void
  page: number
  setPage: (page: number) => void
  filters: F
  submittedFilters: F
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void
  submitFilters: () => void
  resetFilters: () => void
}

const DEFAULT_PAGE_SIZE = 20
const DEFAULT_DEBOUNCE_MS = 300
const EMPTY_META: PageMeta = { page: 0, pageSize: DEFAULT_PAGE_SIZE, pages: 0, total: 0 }

function readFiltersFromUrl(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const out: Record<string, unknown> = {}
  params.forEach((value, key) => {
    try {
      out[key] = JSON.parse(value)
    } catch {
      out[key] = value
    }
  })
  return out
}

function writeFiltersToUrl(filters: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      params.set(key, serialized)
    }
  })
  const query = params.toString()
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
  window.history.replaceState(null, '', url)
}

export function useList<T, F extends ListFilters>({
  fetcher,
  filters,
  pageSize = DEFAULT_PAGE_SIZE,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  persistFilters = true,
  refreshToken,
  submitOnEnter = false,
}: UseListParams<T, F>): UseListResult<T, F> {
  const [rows, setRows] = useState<T[]>([])
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [page, setPage] = useState(0)

  const [localFilters, setLocalFilters] = useState<F>(() => {
    if (!persistFilters) return filters
    const urlFilters = readFiltersFromUrl()
    return { ...filters, ...urlFilters } as F
  })
  const [submittedFilters, setSubmittedFilters] = useState<F>(() => {
    if (!persistFilters) return filters
    const urlFilters = readFiltersFromUrl()
    return { ...filters, ...urlFilters } as F
  })

  const [submitVersion, setSubmitVersion] = useState(0)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  const reload = useCallback(() => {
    setSubmitVersion((v) => v + 1)
  }, [])

  const submitFilters = useCallback(() => {
    setSubmittedFilters(localFilters)
    setSubmitVersion((v) => v + 1)
    setPage(0)
  }, [localFilters])

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setLocalFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (!submitOnEnter) {
        setSubmittedFilters(next)
        setSubmitVersion((v) => v + 1)
      }
      return next
    })
    if (!submitOnEnter) {
      setPage(0)
    }
  }, [submitOnEnter])

  const resetFilters = useCallback(() => {
    const next = { ...filters }
    setLocalFilters(next)
    setSubmittedFilters(next)
    setSubmitVersion((v) => v + 1)
    setPage(0)
    if (persistFilters) {
      writeFiltersToUrl(next as unknown as Record<string, unknown>)
    }
  }, [filters, persistFilters])

  // Sync when parent-provided initial filters change (only after initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setLocalFilters(filters)
    setSubmittedFilters(filters)
    setSubmitVersion((v) => v + 1)
    setPage(0)
  }, [filters])

  // External refresh trigger (e.g. after a mutation in the parent)
  useEffect(() => {
    if (refreshToken !== undefined && refreshToken > 0) {
      setSubmitVersion((v) => v + 1)
    }
  }, [refreshToken])

  // Persist submittedFilters to URL (debounced)
  useEffect(() => {
    if (!persistFilters) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      writeFiltersToUrl(submittedFilters as unknown as Record<string, unknown>)
    }, debounceMs)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [submittedFilters, persistFilters, debounceMs])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    fetcher({ page, size: pageSize, ...submittedFilters })
      .then((data) => {
        if (controller.signal.aborted) return
        setRows(data.result)
        setMeta(data.meta)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isCancel(err)) return
        setError(err)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [page, pageSize, submittedFilters, submitVersion, fetcher])

  return {
    rows,
    meta,
    loading,
    error,
    reload,
    page,
    setPage,
    filters: localFilters,
    submittedFilters,
    setFilter,
    submitFilters,
    resetFilters,
  }
}
