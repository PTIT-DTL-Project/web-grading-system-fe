import { isCancel } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getResultsBySubmission } from '../../../shared/api/endpoints/results'
import type { ResultResponse } from '../../../shared/types/result'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_MS = 10 * 60 * 1000

export interface SubmissionResultState {
  results: ResultResponse[]
  loading: boolean
  error: unknown
  isReady: boolean
  timedOut: boolean
  retry: () => void
}

export function useSubmissionResult(submissionId: string): SubmissionResultState {
  const [results, setResults] = useState<ResultResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [version, setVersion] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasResultRef = useRef(false)
  const startRef = useRef(0)

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
    startRef.current = Date.now()
    setTimedOut(false)
    setLoading(true)
    fetch(controller)
    pollingRef.current = setInterval(() => {
      if (hasResultRef.current) return
      // Review: 2026-10-07 — a FAILED grading normally still writes a result row,
      // so an endless empty poll means the report never landed (result-service down
      // during retries). Stop and surface instead of spinning forever.
      if (Date.now() - startRef.current > MAX_POLL_MS) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        setTimedOut(true)
        setLoading(false)
        return
      }
      fetch(controller)
    }, POLL_INTERVAL_MS)
    return () => {
      controller.abort()
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [submissionId, fetch, version])

  const retry = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  return { results, loading, error, isReady: results.length > 0, timedOut, retry }
}
