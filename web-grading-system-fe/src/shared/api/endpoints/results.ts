import { getData } from '../http'
import type { ResultResponse } from '../../types/result'
import type { MyAssignmentResultsResponse } from '../../types/assignment'

/**
 * GET /api/v1/results/{submissionId}
 */
export function getResultsBySubmission(
  submissionId: string,
  options?: { signal?: AbortSignal },
): Promise<ResultResponse[]> {
  return getData<ResultResponse[]>(`/api/v1/results/${submissionId}`, undefined, options)
}

/**
 * GET /api/v1/results/student/assignment/{assignmentId}
 * The calling student's own results on one assignment — no student id in the
 * path; the backend derives it from the gateway-trusted X-User-Id header.
 */
export function getMyAssignmentResults(
  assignmentId: string,
  options?: { signal?: AbortSignal },
): Promise<MyAssignmentResultsResponse> {
  return getData<MyAssignmentResultsResponse>(
    `/api/v1/results/student/assignment/${assignmentId}`,
    undefined,
    options,
  )
}
