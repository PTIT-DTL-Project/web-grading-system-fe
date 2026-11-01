import type { RunTimelineEvent } from '../../../shared/types/aiAgent'

export type TimelineItem =
  | { kind: 'reasoning'; id: string; modelTurn: number | null; text: string; status: 'RUNNING' | 'COMPLETED'; available: boolean }
  | { kind: 'tool'; id: string; modelTurn: number | null; name: string; arguments: string; result: string; status: 'RUNNING' | 'COMPLETED' | 'FAILED'; durationMs: number | null }

export interface RunTimelineState {
  lastSequence: number
  items: TimelineItem[]
  answer: string
  terminal: boolean
  hasTimeline: boolean
}

export const emptyRunTimeline = (): RunTimelineState => ({ lastSequence: 0, items: [], answer: '', terminal: false, hasTimeline: false })

const asText = (value: unknown) => typeof value === 'string' ? value : ''

export function reduceRunTimeline(state: RunTimelineState, event: RunTimelineEvent): RunTimelineState {
  if (event.version !== 1 || event.sequence <= state.lastSequence) return state
  const next: RunTimelineState = { ...state, lastSequence: event.sequence, items: [...state.items], hasTimeline: true }
  const id = event.itemId ?? `${event.type}-${event.sequence}`
  const index = next.items.findIndex(item => item.id === id)
  const old = index >= 0 ? next.items[index] : null

  if (event.type === 'reasoning.started' && !old) {
    next.items.push({ kind: 'reasoning', id, modelTurn: event.modelTurn, text: '', status: 'RUNNING', available: false })
  } else if (event.type === 'reasoning.delta') {
    const item = old?.kind === 'reasoning' ? old : { kind: 'reasoning' as const, id, modelTurn: event.modelTurn, text: '', status: 'RUNNING' as const, available: false }
    const updated = { ...item, text: item.text + asText(event.data.text), available: true }
    if (index >= 0) next.items[index] = updated
    else next.items.push(updated)
  } else if (event.type === 'reasoning.completed' && old?.kind === 'reasoning') {
    next.items[index] = { ...old, status: 'COMPLETED', available: Boolean(event.data.available) }
  } else if (event.type === 'tool.started' && !old) {
    next.items.push({ kind: 'tool', id, modelTurn: event.modelTurn, name: asText(event.data.name),
      arguments: asText(event.data.arguments), result: '', status: 'RUNNING', durationMs: null })
  } else if ((event.type === 'tool.completed' || event.type === 'tool.failed') && old?.kind === 'tool') {
    next.items[index] = { ...old, result: asText(event.data.result ?? event.data.error),
      status: event.type === 'tool.completed' ? 'COMPLETED' : 'FAILED',
      durationMs: typeof event.data.durationMs === 'number' ? event.data.durationMs : null }
  } else if (event.type === 'assistant.delta') {
    next.answer += asText(event.data.text)
  } else if (event.type === 'assistant.replace') {
    next.answer = asText(event.data.text)
  } else if (['run.completed', 'run.failed', 'run.cancelled'].includes(event.type)) {
    next.terminal = true
  }
  return next
}
