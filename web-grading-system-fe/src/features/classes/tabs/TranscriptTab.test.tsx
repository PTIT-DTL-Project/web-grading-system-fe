// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../../../locales/i18n'
import type { TranscriptEntryResponse } from '../../../shared/types/score'

// antd's Table subscribes to breakpoints/resize through APIs jsdom lacks.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList
  }
  if (!('ResizeObserver' in window)) {
    class StubResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = StubResizeObserver
  }
}

const row: TranscriptEntryResponse = {
  studentCode: 'B22DCCN001',
  studentName: 'Nguyen Van An',
  entries: [
    { type: 'ATTENDANCE', weight: 0.1, score: 10 },
    { type: 'EXERCISE', weight: 0.3, score: 7.5 },
    { type: 'FINAL_EXAM', weight: 0.6, score: 8 },
  ],
  total: 7.75,
  letterGrade: 'B',
  gpa: 3,
}

const state: { rows: TranscriptEntryResponse[] } = { rows: [row] }

vi.mock('../useTranscript', () => ({
  useTranscript: () => ({
    rows: state.rows,
    meta: { page: 0, pageSize: 20, pages: 1, total: state.rows.length },
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}))

import { TranscriptTab } from './TranscriptTab'

afterEach(() => {
  cleanup()
  state.rows = [row]
})

/**
 * The table used to filter EXERCISE out of its columns, so a class weighted
 * 10/30/60 showed only attendance and the final exam — the assignment score was
 * invisible even though it was already part of the total.
 * Review: 2026-11-21, user report.
 */
describe('TranscriptTab columns', () => {
  it('shows the auto-graded exercise component', () => {
    const { container } = render(<TranscriptTab classId="c1" />)
    const text = container.textContent ?? ''

    expect(text).toContain('Điểm bài tập (30%)')
    expect(text).toContain('7.5')
    // Header uses the translated label instead of the raw enum.
    expect(text).not.toContain('EXERCISE')
  })

  it('keeps every configured component, in configured order', () => {
    const { container } = render(<TranscriptTab classId="c1" />)
    const text = container.textContent ?? ''
    const attendance = text.indexOf('Điểm chuyên cần (10%)')
    const exercise = text.indexOf('Điểm bài tập (30%)')
    const finalExam = text.indexOf('Điểm thi cuối kỳ (60%)')

    expect(attendance).toBeGreaterThan(-1)
    expect(exercise).toBeGreaterThan(attendance)
    expect(finalExam).toBeGreaterThan(exercise)
  })

  it('reads 0 for an auto-graded component with nothing graded yet', () => {
    state.rows = [
      {
        ...row,
        entries: [
          { type: 'ATTENDANCE', weight: 0.1, score: 10 },
          { type: 'EXERCISE', weight: 0.3, score: null },
          { type: 'FINAL_EXAM', weight: 0.6, score: 8 },
        ],
        total: null,
        letterGrade: null,
        gpa: null,
      },
    ]

    const { container } = render(<TranscriptTab classId="c1" />)
    const cells = Array.from(container.querySelectorAll('tbody tr td')).map((td) => td.textContent ?? '')
    const empties = cells.filter((text) => text === 'Không có dữ liệu')

    // Điểm bài tập chưa có → đọc 0. Ba ô trống còn lại là Tổng điểm / Xếp loại / GPA
    // (null vì chưa đủ thành phần), không phải cột điểm bài tập.
    expect(cells).toContain('0')
    expect(empties).toHaveLength(3)
  })
})
