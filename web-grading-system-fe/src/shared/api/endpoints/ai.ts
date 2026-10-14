import { getData, sendData } from '../http'
import { ApiError } from '../errors'
import type { AiExplanationResponse } from '../../types/ai'

/**
 * GET /api/v1/ai/submissions/{submissionId}/explain
 * Returns cached AI explanation or null if not yet analyzed.
 */
export async function getAiExplanation(
  submissionId: string,
  options?: { signal?: AbortSignal },
): Promise<AiExplanationResponse | null> {
  try {
    return await getData<AiExplanationResponse>(
      `/api/v1/ai/submissions/${submissionId}/explain`,
      undefined,
      options,
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null
    }
    throw err
  }
}

/**
 * POST /api/v1/ai/submissions/{submissionId}/explain
 * Triggers AI analysis for the submission (or returns cached if already run).
 */
export function triggerAiExplanation(
  submissionId: string,
  options?: { signal?: AbortSignal },
): Promise<AiExplanationResponse> {
  return sendData<AiExplanationResponse, undefined>(
    `/api/v1/ai/submissions/${submissionId}/explain`,
    'post',
    undefined,
    options,
  )
}
