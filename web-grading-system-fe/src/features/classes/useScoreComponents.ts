import { isCancel } from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getScoreComponents, saveScoreComponents } from '../../shared/api/endpoints/classes'
import type { ScoreComponentResponse } from '../../shared/types/score'

export interface ScoreComponentsState {
  rows: ScoreComponentResponse[]
  loading: boolean
  error: unknown
  reload: () => void
  save: (rows: ScoreComponentResponse[]) => Promise<void>
}

export function useScoreComponents(classId: string): ScoreComponentsState {
  const [rows, setRows] = useState<ScoreComponentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [internalVersion, setInternalVersion] = useState(0)

  const reload = useCallback(() => setInternalVersion((v) => v + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getScoreComponents(classId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setRows(data)
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
  }, [classId, internalVersion])

  const save = async (newRows: ScoreComponentResponse[]) => {
    const controller = new AbortController()
    try {
      const result = await saveScoreComponents(classId, newRows, { signal: controller.signal })
      setRows(result)
    } finally {
      controller.abort()
    }
  }

  return { rows, loading, error, reload, save }
}