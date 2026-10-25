import { useEffect, useState, useRef } from 'react'
import { subscribeRunEvents, getRunStatus } from '../../../shared/api/endpoints/ai'
import type { RunResponse } from '../../../shared/types/aiAgent'

interface RunEventsState {
  streamedDelta: string
  activeRun: RunResponse | null
  isStreaming: boolean
  lastEvent: string | null
}

export function useRunEvents(runId: string | null, onRunComplete?: () => void) {
  const [state, setState] = useState<RunEventsState>({
    streamedDelta: '',
    activeRun: null,
    isStreaming: Boolean(runId),
    lastEvent: null,
  })

  const onRunCompleteRef = useRef(onRunComplete)
  onRunCompleteRef.current = onRunComplete

  useEffect(() => {
    if (!runId) {
      setState({
        streamedDelta: '',
        activeRun: null,
        isStreaming: false,
        lastEvent: null,
      })
      return
    }

    setState((prev) => ({
      ...prev,
      streamedDelta: '',
      isStreaming: true,
      lastEvent: 'connecting',
    }))

    let cancelled = false
    let completed = false
    const refreshStatus = () => {
      void getRunStatus(runId)
        .then((run) => {
          if (cancelled) return
          setState((prev) => ({ ...prev, activeRun: run }))
          if (!completed && ['SUCCEEDED', 'FAILED', 'CANCELLED', 'LIMIT_REACHED'].includes(run.status)) {
            completed = true
            setState((prev) => ({ ...prev, isStreaming: false }))
            onRunCompleteRef.current?.()
          }
        })
        .catch(() => {})
    }

    refreshStatus()
    const statusInterval = window.setInterval(() => {
      if (!completed) refreshStatus()
    }, 1000)

    const unsubscribe = subscribeRunEvents(
      runId,
      (event: MessageEvent) => {
        try {
          const type = event.type || 'message'
          if (event.data) {
            setState((prev) => ({
              ...prev,
              lastEvent: type,
              streamedDelta: type === 'assistant.replace' ? event.data : prev.streamedDelta + event.data,
            }))
          }
        } catch {
          // ignore
        }
      },
      () => {
        refreshStatus()
      },
    )

    return () => {
      cancelled = true
      window.clearInterval(statusInterval)
      unsubscribe()
    }
  }, [runId])

  return state
}
