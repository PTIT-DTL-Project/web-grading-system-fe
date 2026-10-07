import { getData } from '../http'
import type { AssignmentResponse, PlanResponse, DockerImageResponse } from '../../types/assignment'
import type { Page } from '../../types/pagination'

/** GET /api/v1/student/assignments */
export function listStudentAssignments(
  page: number,
  size: number,
  search?: string,
  classId?: string,
  options?: { signal?: AbortSignal },
): Promise<Page<AssignmentResponse>> {
  return getData<Page<AssignmentResponse>>(
    '/api/v1/student/assignments',
    { page, size, ...(search ? { search } : {}), ...(classId ? { classId } : {}) },
    options,
  )
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

/** GET /api/v1/student/assignments/{id}/docker-images */
export function getAssignmentDockerImages(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<DockerImageResponse[]> {
  return getData<DockerImageResponse[]>(
    `/api/v1/student/assignments/${id}/docker-images`,
    undefined,
    options,
  )
}
