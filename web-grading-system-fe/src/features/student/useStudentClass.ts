import { useEffect, useState } from 'react'
import { getStudentClass } from '../../shared/api/endpoints/studentClasses'
import type { ClassResponse } from '../../shared/types/class'

export interface StudentClassDetailState {
  klass: ClassResponse | null
  loading: boolean
  error: unknown
  reload: () => void
}

export function useStudentClass(classId: string): StudentClassDetailState {
  const [klass, setKlass] = useState<ClassResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getStudentClass(classId, { signal: controller.signal })
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
