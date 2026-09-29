import { useEffect, useState } from 'react'
import { getClass } from '../../shared/api/endpoints/classes'
import type { ClassResponse } from '../../shared/types/class'

export interface ClassDetailState {
  klass: ClassResponse | null
  loading: boolean
  error: unknown
  reload: () => void
}

export function useClassDetail(classId: string): ClassDetailState {
  const [klass, setKlass] = useState<ClassResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getClass(classId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setKlass(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err)
      })
      .finally(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [classId, version])

  return { klass, loading, error, reload }
}