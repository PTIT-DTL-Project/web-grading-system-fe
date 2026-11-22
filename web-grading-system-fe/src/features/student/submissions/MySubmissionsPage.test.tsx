// @vitest-environment jsdom
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../locales/i18n'

// jsdom lacks the browser APIs antd's Table/Select use for responsive layout.
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

const listMySubmissions = vi.fn()
const listStudentAssignments = vi.fn()
const getStudentAssignment = vi.fn()
const getAssignmentPlans = vi.fn()

vi.mock('../../../shared/api/endpoints/submissions', () => ({
  listMySubmissions: (...args: unknown[]) => listMySubmissions(...args),
}))
vi.mock('../../../shared/api/endpoints/studentAssignments', () => ({
  listStudentAssignments: (...args: unknown[]) => listStudentAssignments(...args),
  getStudentAssignment: (...args: unknown[]) => getStudentAssignment(...args),
  getAssignmentPlans: (...args: unknown[]) => getAssignmentPlans(...args),
}))

import { MySubmissionsPage } from './MySubmissionsPage'

const meta = { page: 0, pageSize: 20, pages: 1, total: 0 }
const ASSIGNMENT_ID = '16cebadb-2485-4494-be5b-7f6641887559'

beforeEach(() => {
  listMySubmissions.mockReset().mockResolvedValue({ result: [], meta })
  listStudentAssignments.mockReset().mockResolvedValue({
    result: [{ id: ASSIGNMENT_ID, title: 'Bài kiểm tra CRUD quản lý sinh viên', topic: 't', published: true }],
    meta: { page: 0, pageSize: 100, pages: 1, total: 1 },
  })
  getStudentAssignment.mockReset().mockResolvedValue({ id: ASSIGNMENT_ID, title: 'Bài kiểm tra CRUD quản lý sinh viên' })
  getAssignmentPlans.mockReset().mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

/**
 * "Xem lịch sử nộp" on an assignment opens /student/submissions?assignmentId=…;
 * the history table must open already filtered to that assignment instead of
 * listing every submission the student ever made.
 * Review: 2026-11-22, user report.
 */
describe('MySubmissionsPage deep link', () => {
  it('queries the history with the assignment from the URL', async () => {
    window.history.replaceState(null, '', `/student/submissions?assignmentId=${ASSIGNMENT_ID}`)

    render(
      <StrictMode>
        <MemoryRouter initialEntries={[`/student/submissions?assignmentId=${ASSIGNMENT_ID}`]}>
          <MySubmissionsPage />
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => expect(listMySubmissions).toHaveBeenCalled())
    const params = listMySubmissions.mock.calls.at(-1)?.[3]
    expect(listMySubmissions.mock.calls.at(-1)?.[0]).toBe(0)
    expect(params).toBe(ASSIGNMENT_ID)
  })

  it('keeps the filter applied after the options load (no reset to all)', async () => {
    window.history.replaceState(null, '', `/student/submissions?assignmentId=${ASSIGNMENT_ID}`)

    render(
      <StrictMode>
        <MemoryRouter initialEntries={[`/student/submissions?assignmentId=${ASSIGNMENT_ID}`]}>
          <MySubmissionsPage />
        </MemoryRouter>
      </StrictMode>,
    )

    await waitFor(() => expect(listStudentAssignments).toHaveBeenCalled())
    // Give every effect (including StrictMode's second run) a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(listMySubmissions.mock.calls.at(-1)?.[3]).toBe(ASSIGNMENT_ID)
  })
})
