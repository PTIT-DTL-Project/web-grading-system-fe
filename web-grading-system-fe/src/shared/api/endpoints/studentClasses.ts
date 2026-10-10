import { getData } from '../http'
import type { ClassResponse, StudentRoster } from '../../types/class'
import type { StudentScoresResponse } from '../../types/score'
import type { Page } from '../../types/pagination'

/** GET /api/v1/student/classes — classes the caller is enrolled in. */
export function listStudentClasses(
  page: number,
  size: number,
  search?: string,
  status?: string,
  options?: { signal?: AbortSignal },
): Promise<Page<ClassResponse>> {
  return getData<Page<ClassResponse>>('/api/v1/student/classes', { page, size, ...(search ? { search } : {}), ...(status ? { status } : {}) }, options)
}

/** GET /api/v1/student/classes/{id} — enrollment-checked, no ownerId. */
export function getStudentClass(classId: string, options?: { signal?: AbortSignal }): Promise<ClassResponse> {
  return getData<ClassResponse>(`/api/v1/student/classes/${classId}`, undefined, options)
}

/** GET /api/v1/student/classes/{id}/my-scores — caller's own scores. */
export function getMyScores(classId: string, options?: { signal?: AbortSignal }): Promise<StudentScoresResponse> {
  return getData<StudentScoresResponse>(`/api/v1/student/classes/${classId}/my-scores`, undefined, options)
}

/** GET /api/v1/student/classes/{id}/students — enrolled classmates, codes and names only. */
export function listClassRoster(
  classId: string,
  page: number,
  size: number,
  options?: { signal?: AbortSignal },
): Promise<Page<StudentRoster>> {
  return getData<Page<StudentRoster>>(`/api/v1/student/classes/${classId}/students`, { page, size }, options)
}
