import { useEffect, useRef, useState } from 'react'
import { subscribeRunEvents, getRunStatus } from '../../../shared/api/endpoints/ai'
import type { RunResponse } from '../../../shared/types/aiAgent'
import { emptyRunTimeline, reduceRunTimeline, type RunTimelineState } from './runTimelineReducer'

const terminal = (status: string) => ['SUCCEEDED', 'FAILED', 'CANCELLED', 'LIMIT_REACHED'].includes(status)

export function useRunEvents(runId: string | null, historyRunIds: string[], onRunComplete?: () => void) {
  const [timelines, setTimelines] = useState<Record<string, RunTimelineState>>({})
  const [loadedRunIds, setLoadedRunIds] = useState<Record<string, boolean>>({})
  const [activeRun, setActiveRun] = useState<RunResponse | null>(null)
  const [isStreaming, setIsStreaming] = useState(Boolean(runId))
  const onCompleteRef = useRef(onRunComplete)
  onCompleteRef.current = onRunComplete
  const timelineRef = useRef(timelines)
  timelineRef.current = timelines
  const idsKey = [...new Set([...historyRunIds, ...(runId ? [runId] : [])])].sort().join('|')

  useEffect(() => {
    if (!runId) { setActiveRun(null); setIsStreaming(false); return }
    let cancelled = false
    let completed = false
    const refresh = () => {
      void getRunStatus(runId).then(run => {
        if (cancelled) return
        setActiveRun(run)
        if (!completed && terminal(run.status)) {
          completed = true
          setIsStreaming(false)
          onCompleteRef.current?.()
        }
      }).catch(() => {})
    }
    setIsStreaming(true)
    refresh()
    const interval = window.setInterval(refresh, 1000)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [runId])

  useEffect(() => {
    if (!idsKey) return
    const ids = idsKey.split('|')
    const cleaners: Array<() => void> = []
    let cancelled = false
    for (const id of ids) {
      let unsubscribe: (() => void) | null = null
      let retry: number | null = null
      const connect = () => {
        if (cancelled) return
        unsubscribe = subscribeRunEvents(id, timelineRef.current[id]?.lastSequence ?? 0, event => {
          setTimelines(previous => {
            const next = { ...previous, [id]: reduceRunTimeline(previous[id] ?? emptyRunTimeline(), event) }
            timelineRef.current = next
            return next
          })
        }, error => {
          if (error.type === 'close') setLoadedRunIds(previous => ({ ...previous, [id]: true }))
          if (!cancelled && id === runId && !timelineRef.current[id]?.terminal) {
            retry = window.setTimeout(connect, 1000)
          }
        })
      }
      connect()
      cleaners.push(() => { unsubscribe?.(); if (retry != null) window.clearTimeout(retry) })
    }
    return () => { cancelled = true; cleaners.forEach(clean => clean()) }
  }, [idsKey, runId])

  return {
    timelines,
    loadedRunIds,
    streamedDelta: runId ? timelines[runId]?.answer ?? '' : '',
    activeRun,
    isStreaming,
  }
}
