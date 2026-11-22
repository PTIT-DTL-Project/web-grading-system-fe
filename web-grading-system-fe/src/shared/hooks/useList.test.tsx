// @vitest-environment jsdom
import { StrictMode } from 'react'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useList } from './useList'
import type { ListFilters } from './useList'

const meta = { page: 0, pageSize: 20, pages: 1, total: 0 }

function setUrl(url: string) {
  window.history.replaceState(null, '', url)
}

afterEach(() => {
  cleanup()
  setUrl('/')
})

/**
 * Deep links carry the filters in the query string: "Xem lịch sử nộp" on the
 * assignment page opens /student/submissions?assignmentId=…, and the list must
 * query with that filter instead of showing every submission of the student.
 * Review: 2026-11-22, user report.
 */
describe('useList URL hydration', () => {
  it('queries with the filter carried by the deep link', async () => {
    setUrl('/student/submissions?assignmentId=6f1c8a9e-1b2c-4d3e-8f90-abcdef123456')
    const fetcher = vi.fn().mockResolvedValue({ result: [], meta })

    const { result } = renderHook(() =>
      useList<{ id: string }, ListFilters & { assignmentId?: string }>({
        fetcher,
        filters: {},
      }),
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalled())
    expect(fetcher.mock.calls[0][0]).toMatchObject({
      assignmentId: '6f1c8a9e-1b2c-4d3e-8f90-abcdef123456',
    })
    // The control must render the hydrated value, not its placeholder.
    expect(result.current.filters.assignmentId).toBe('6f1c8a9e-1b2c-4d3e-8f90-abcdef123456')
  })

  it('keeps the deep-linked filter when the caller passes a stable initial object', async () => {
    const EMPTY: ListFilters & { assignmentId?: string } = {}
    setUrl('/student/submissions?assignmentId=abc-123&search=lab')
    const fetcher = vi.fn().mockResolvedValue({ result: [], meta })

    renderHook(() => useList<{ id: string }, { assignmentId?: string; search?: string }>({
      fetcher,
      filters: EMPTY,
    }))

    await waitFor(() => expect(fetcher).toHaveBeenCalled())
    expect(fetcher.mock.calls[0][0]).toMatchObject({ assignmentId: 'abc-123', search: 'lab' })
  })

  it('keeps the deep-linked filter under StrictMode double-run effects', async () => {
    // The app mounts under <StrictMode>, which runs every effect twice. A
    // "first mount" ref guard then reports the second run as a parent update and
    // resets the filters, so /student/submissions?assignmentId=… silently dropped
    // its filter and listed every submission. Review: 2026-11-22, user report.
    setUrl('/student/submissions?assignmentId=abc-123')
    const fetcher = vi.fn().mockResolvedValue({ result: [], meta })

    const { result } = renderHook(
      () => useList<{ id: string }, ListFilters & { assignmentId?: string }>({
        fetcher,
        filters: {},
      }),
      { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> },
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalled())
    // Let the debounced URL write and any follow-up effect settle.
    await waitFor(() => expect(result.current.filters.assignmentId).toBe('abc-123'))
    expect(fetcher.mock.calls.at(-1)?.[0]).toMatchObject({ assignmentId: 'abc-123' })
    expect(window.location.search).toContain('assignmentId=abc-123')
  })

  it('re-applies filters when the parent genuinely changes them', async () => {
    const fetcher = vi.fn().mockResolvedValue({ result: [], meta })
    const { rerender } = renderHook(
      ({ classId }: { classId?: string }) =>
        useList<{ id: string }, ListFilters & { classId?: string }>({
          fetcher,
          filters: classId ? { classId } : {},
        }),
      { initialProps: { classId: undefined } as { classId?: string } },
    )

    await waitFor(() => expect(fetcher).toHaveBeenCalled())
    rerender({ classId: 'class-1' })
    await waitFor(() =>
      expect(fetcher.mock.calls.at(-1)?.[0]).toMatchObject({ classId: 'class-1' }),
    )
  })
})
