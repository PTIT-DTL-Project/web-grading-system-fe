import { isCancel } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { listStudents } from '../../shared/api/endpoints/classes'
import type { ClassStudentResponse } from '../../shared/types/class'
import type { PageMeta } from '../../shared/types/pagination'

/** Readable before the first response lands, so meta.page + 1 / meta.total never an undefined deref on first render (pageSize mirrors the default page size). */
const EMPTY_META: PageMeta = { page: 0, pageSize: 20, pages: 0, total: 0 }

export interface StudentsState {
  rows: ClassStudentResponse[]
  meta: PageMeta
  loading: boolean
  error: unknown
  reload: () => void
}

export function useStudents(classId: string, page: number, pageSize: number): StudentsState {
  const [rows, setRows] = useState<ClassStudentResponse[]>([])
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [internalVersion, setInternalVersion] = useState(0)

  const reload = useCallback(() => setInternalVersion((v) => v + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    listStudents(classId, page, pageSize, { signal: controller.signal })
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
  }, [classId, page, pageSize, internalVersion])

  return { rows, meta, loading, error, reload }
}