import { describe, expect, it } from 'vitest'
import { reduceRunTimeline, emptyRunTimeline } from './runTimelineReducer'
import type { RunTimelineEvent } from '../../../shared/types/aiAgent'

const event = (sequence: number, type: string, itemId: string | null, data: Record<string, unknown>): RunTimelineEvent => ({
  version: 1, runId: 'run-1', sequence, type, modelTurn: 1, itemId,
  timestamp: '2026-11-01T00:00:00Z', data,
})

describe('run timeline', () => {
  it('keeps reasoning and tool cards in start order and ignores replay duplicates', () => {
    const events = [
      event(1, 'reasoning.started', 'r1', {}),
      event(2, 'reasoning.delta', 'r1', { text: 'Check ' }),
      event(3, 'tool.started', 't1', { name: 'lookup', arguments: '{}' }),
      event(4, 'reasoning.delta', 'r1', { text: 'data' }),
      event(5, 'tool.completed', 't1', { result: 'done', durationMs: 12 }),
    ]
    const state = [...events, events[1]].reduce(reduceRunTimeline, emptyRunTimeline())
    expect(state.lastSequence).toBe(5)
    expect(state.items.map(item => item.id)).toEqual(['r1', 't1'])
    expect(state.items[0]).toMatchObject({ kind: 'reasoning', text: 'Check data' })
    expect(state.items[1]).toMatchObject({ kind: 'tool', result: 'done', status: 'COMPLETED' })
  })
  it('links tools that finish in reverse order and marks failures', () => {
    const events = [
      event(1, 'tool.started', 'first', { name: 'lookupA', arguments: '{}' }),
      event(2, 'tool.started', 'second', { name: 'lookupB', arguments: '{}' }),
      event(3, 'tool.completed', 'second', { result: 'B', durationMs: 4 }),
      event(4, 'tool.failed', 'first', { result: 'bad input', durationMs: 9 }),
      event(5, 'run.failed', null, { error: 'bad input' }),
    ]
    const state = events.reduce(reduceRunTimeline, emptyRunTimeline())
    expect(state.items.map(item => item.id)).toEqual(['first', 'second'])
    expect(state.items[0]).toMatchObject({ status: 'FAILED', result: 'bad input' })
    expect(state.items[1]).toMatchObject({ status: 'COMPLETED', result: 'B' })
    expect(state.terminal).toBe(true)
  })
  it('closes unfinished cards when a run is cancelled', () => {
    const state = [
      event(1, 'reasoning.started', 'r', {}),
      event(2, 'tool.started', 't', { name: 'lookup', arguments: '{}' }),
      event(3, 'run.cancelled', null, { status: 'CANCELLED' }),
    ].reduce(reduceRunTimeline, emptyRunTimeline())
    expect(state.items[0]).toMatchObject({ status: 'COMPLETED' })
    expect(state.items[1]).toMatchObject({ status: 'FAILED' })
  })
})
