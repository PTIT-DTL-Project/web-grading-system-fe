import { isCancel } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getTranscript } from '../../shared/api/endpoints/classes'
import type { TranscriptEntryResponse } from '../../shared/types/score'
import type { PageMeta } from '../../shared/types/pagination'

/** Readable before the first response lands, so meta.page + 1 / meta.total never an undefined deref on first render (pageSize mirrors the default page size). */
const EMPTY_META: PageMeta = { page: 0, pageSize: 20, pages: 0, total: 0 }

export interface TranscriptState {
  rows: TranscriptEntryResponse[]
  meta: PageMeta
  loading: boolean
  error: unknown
  reload: () => void
}

export function useTranscript(classId: string, page: number, pageSize: number): TranscriptState {
  const [rows, setRows] = useState<TranscriptEntryResponse[]>([])
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [internalVersion, setInternalVersion] = useState(0)

  const reload = useCallback(() => setInternalVersion((v) => v + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getTranscript(classId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        // Transcript is not paginated by server; we apply client-side pagination.
        const start = page * pageSize
        const end = start + pageSize
        const paginated = data.slice(start, end)
        const total = data.length
        const pages = Math.ceil(total / pageSize)
        setRows(paginated)
        setMeta({ page, pageSize, pages, total })
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
  }, [classId, page, pageSize, internalVersion])

  return { rows, meta, loading, error, reload }
}