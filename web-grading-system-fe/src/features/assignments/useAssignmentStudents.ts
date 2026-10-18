import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { listStudents } from '../../shared/api/endpoints/classes'
import type { ClassStudentResponse } from '../../shared/types/class'

export interface StudentOption {
  label: string
  value: string
}

/**
 * The dropdown's canonical student list: fetched from the class roster
 * (GET /api/v1/classes/{id}/students) so it stays complete — including
 * students who have not yet submitted — regardless of which assignment
 * view is open. The former approach derived options from listResults /
 * listSubmissions, which only returned students with graded data and left
 * the dropdown empty on assignments with no submissions yet. Those calls
 * also duplicated the assignment fetch and triggered spurious 500s.
 *
 * Review: 2026-10-20, Pullfrog (redundant-call / 500 fix).
 */
export function useAssignmentStudents(classId: string): UseQueryResult<StudentOption[]> {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: () =>
      listStudents(classId, 0, 1000).then((page) => page.result.map(toStudentOption)),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/** Roster rows carry the roster code/name the dropdown shows plus a stable fallback id. */
function toStudentOption(student: ClassStudentResponse): StudentOption {
  const label = [student.studentCode, student.studentName].filter(Boolean).join(' — ') || student.id.slice(0, 8)
  // The dropdown's select value is the studentCode so useList forwards it as
  // ?studentCode= to course-service, which resolves it back to a user id. A departed
  // student (no roster code) is still selectable via its row id — selecting them returns
  // empty data rather than crashing the page. Review: 2026-10-20.
  return { label, value: student.studentCode ?? student.id }
}
