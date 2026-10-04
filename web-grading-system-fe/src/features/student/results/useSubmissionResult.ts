import { isCancel } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getResultsBySubmission } from '../../../shared/api/endpoints/results'
import type { ResultResponse } from '../../../shared/types/result'

const POLL_INTERVAL_MS = 3000

export interface SubmissionResultState {
  results: ResultResponse[]
  loading: boolean
  error: unknown
  isReady: boolean
}

export function useSubmissionResult(submissionId: string): SubmissionResultState {
  const [results, setResults] = useState<ResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasResultRef = useRef(false)

  const fetch = useCallback(
    (controller: AbortController) => {
      getResultsBySubmission(submissionId, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return
          setResults(data)
          setError(null)
          setLoading(false)
          if (data.length > 0) {
            hasResultRef.current = true
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || isCancel(err)) return
          setError(err)
          setLoading(false)
        })
    },
    [submissionId],
  )

  useEffect(() => {
    if (!submissionId) return
    const controller = new AbortController()
    hasResultRef.current = false
    fetch(controller)
    pollingRef.current = setInterval(() => {
      if (!hasResultRef.current) fetch(controller)
    }, POLL_INTERVAL_MS)
    return () => {
      controller.abort()
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [submissionId, fetch])

  return { results, loading, error, isReady: results.length > 0 }
}
