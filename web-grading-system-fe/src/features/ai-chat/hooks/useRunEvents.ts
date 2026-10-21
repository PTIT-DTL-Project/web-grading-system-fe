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

    // Poll status initially
    getRunStatus(runId)
      .then((run) => {
        setState((prev) => ({ ...prev, activeRun: run }))
      })
      .catch(() => {})

    const unsubscribe = subscribeRunEvents(
      runId,
      (event: MessageEvent) => {
        try {
          const type = event.type || 'message'
          if (event.data) {
            setState((prev) => ({
              ...prev,
              lastEvent: type,
              streamedDelta: prev.streamedDelta + event.data,
            }))
          }
        } catch {
          // ignore
        }
      },
      () => {
        // On error or close, check final status
        getRunStatus(runId)
          .then((run) => {
            setState((prev) => ({ ...prev, activeRun: run, isStreaming: false }))
            if (run.status === 'SUCCEEDED' || run.status === 'FAILED' || run.status === 'CANCELLED') {
              onRunCompleteRef.current?.()
            }
          })
          .catch(() => {
            setState((prev) => ({ ...prev, isStreaming: false }))
          })
      },
    )

    return () => {
      unsubscribe()
    }
  }, [runId])

  return state
}
