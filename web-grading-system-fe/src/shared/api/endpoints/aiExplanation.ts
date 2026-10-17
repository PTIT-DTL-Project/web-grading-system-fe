import { getData, sendData } from '../http'
import { isApiError } from '../errors'
import type { AiExplanationResponse } from '../../types/aiExplanation'

const explainUrl = (submissionId: string) =>
  `/api/v1/ai/submissions/${submissionId}/explain`

/**
 * GET /api/v1/ai/submissions/{submissionId}/explain — cache-only, never calls the LLM.
 *
 * A 404 means "no explanation generated yet", not a failure: normalise it to
 * `null` so the card renders the generate CTA. Left as a thrown error it would be
 * mapped to `errors.notFound` by `getErrorMessage` and read as a real problem.
 */
export function getAiExplanation(
  submissionId: string,
  options?: { signal?: AbortSignal },
): Promise<AiExplanationResponse | null> {
  return getData<AiExplanationResponse>(explainUrl(submissionId), undefined, options).catch(
    (error: unknown) => {
      if (isApiError(error) && error.status === 404) return null
      throw error
    },
  )
}

/**
 * POST /api/v1/ai/submissions/{submissionId}/explain — generates via the LLM
 * (~5-6s) or returns the cached row. Idempotent, so a second call is safe.
 */
export function generateAiExplanation(
  submissionId: string,
): Promise<AiExplanationResponse> {
  return sendData<AiExplanationResponse, undefined>(explainUrl(submissionId), 'post')
}
