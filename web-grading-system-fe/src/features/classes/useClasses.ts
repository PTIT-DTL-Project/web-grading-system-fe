import { isCancel } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { listClasses } from '../../shared/api/endpoints/classes'
import type { ClassResponse } from '../../shared/types/class'
import type { PageMeta } from '../../shared/types/pagination'

/**
 * Readable before the first response lands, so `meta.page + 1` / `meta.total` are never
 * an undefined deref on the first render (pageSize mirrors the default page size).
 */
const EMPTY_META: PageMeta = { page: 0, pageSize: 20, pages: 0, total: 0 }

export interface ClassesState {
  rows: ClassResponse[]
  meta: PageMeta
  loading: boolean
  error: unknown
  reload: () => void
}

export function useClasses(page: number, pageSize: number, search?: string): ClassesState {
  const [rows, setRows] = useState<ClassResponse[]>([])
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    listClasses(page, pageSize, search, undefined, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setRows(data.result)
        setMeta(data.meta)
        setError(null)
      })
      .catch((err: unknown) => {
        // Stale-by-race responses are dropped: our own abort (re-run/unmount) rejects the
        // request, so a slower older page can never overwrite a newer one.
        if (controller.signal.aborted || isCancel(err)) return
        setError(err)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [page, pageSize, version])

  return { rows, meta, loading, error, reload }
}
