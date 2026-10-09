import { useEffect, useState } from 'react'
import { getMyScores } from '../../../shared/api/endpoints/studentClasses'
import type { StudentScoresResponse } from '../../../shared/types/score'

export interface StudentScoresState {
  scores: StudentScoresResponse | null
  loading: boolean
  error: unknown
  reload: () => void
}

export function useStudentScores(classId: string): StudentScoresState {
  const [scores, setScores] = useState<StudentScoresResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [version, setVersion] = useState(0)

  const reload = () => setVersion((v) => v + 1)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getMyScores(classId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setScores(data)
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

  return { scores, loading, error, reload }
}
