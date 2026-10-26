import { getData } from '../http'
import type { AssignmentResponse, PlanResponse, AssignmentPurpose } from '../../types/assignment'
import type { Page } from '../../types/pagination'

/** GET /api/v1/student/assignments (mặc định purpose=GRADED) */
export function listStudentAssignments(
  page: number,
  size: number,
  search?: string,
  classId?: string,
  purpose?: AssignmentPurpose,
  topic?: string,
  options?: { signal?: AbortSignal },
): Promise<Page<AssignmentResponse>> {
  return getData<Page<AssignmentResponse>>(
    '/api/v1/student/assignments',
    {
      page,
      size,
      ...(purpose ? { purpose } : {}),
      ...(topic ? { topic } : {}),
      ...(search ? { search } : {}),
      ...(classId ? { classId } : {}),
    },
    options,
  )
}

/** GET /api/v1/student/assignments/topics — chủ đề của bài luyện tập đã công khai. */
export function listStudentPracticeTopics(options?: { signal?: AbortSignal }): Promise<string[]> {
  return getData<string[]>('/api/v1/student/assignments/topics', {}, options)
}

/** GET /api/v1/student/assignments/{id} */
export function getStudentAssignment(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<AssignmentResponse> {
  return getData<AssignmentResponse>(`/api/v1/student/assignments/${id}`, undefined, options)
}

/** GET /api/v1/student/assignments/{id}/plans */
export function getAssignmentPlans(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<PlanResponse[]> {
  return getData<PlanResponse[]>(`/api/v1/student/assignments/${id}/plans`, undefined, options)
}
