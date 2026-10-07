import { getData } from '../http'
import type { ResultResponse } from '../../types/result'

/**
 * GET /api/v1/results/{submissionId}
 */
export function getResultsBySubmission(
  submissionId: string,
  options?: { signal?: AbortSignal },
): Promise<ResultResponse[]> {
  return getData<ResultResponse[]>(`/api/v1/results/${submissionId}`, undefined, options)
}
