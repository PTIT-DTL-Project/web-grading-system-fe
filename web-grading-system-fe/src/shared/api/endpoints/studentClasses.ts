import { getData } from '../http'
import type { ClassResponse } from '../../types/class'
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
