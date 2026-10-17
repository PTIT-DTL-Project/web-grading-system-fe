import { getData, sendData } from '../http'
import { isApiError } from '../errors'
import type { AiExplanationResponse } from '../../types/aiExplanation'

// Two routes for the same resource, split by audience so each carries one
// authorization rule: a student's own submission, or a submission inside an
// assignment the lecturer owns. The lecturer route needs the assignment id in
// the path — it is what the backend checks ownership against.
const explainUrl = (submissionId: string, assignmentId?: string) =>
  assignmentId
    ? `/api/v1/ai/assignments/${assignmentId}/submissions/${submissionId}/explain`
    : `/api/v1/ai/submissions/${submissionId}/explain`

/**
 * GET — cache-only, never calls the LLM.
 *
 * A 404 means "no explanation generated yet", not a failure: normalise it to
 * `null` so the card renders the generate CTA. Left as a thrown error it would be
 * mapped to `errors.notFound` by `getErrorMessage` and read as a real problem.
 * On the lecturer route a 404 also covers every submission outside the caller's
 * own assignments, which the same `null` handles correctly.
 */
export function getAiExplanation(
  submissionId: string,
  options?: { signal?: AbortSignal; assignmentId?: string },
): Promise<AiExplanationResponse | null> {
  return getData<AiExplanationResponse>(
    explainUrl(submissionId, options?.assignmentId),
    undefined,
    { signal: options?.signal },
  ).catch((error: unknown) => {
    if (isApiError(error) && error.status === 404) return null
    throw error
  })
}

/**
 * POST — generates via the LLM (~5-6s) or returns the cached row. Idempotent, so
 * a second call is safe. A lecturer's generation is cached under the student's id,
 * so it also warms what that student reads next.
 */
export function generateAiExplanation(
  submissionId: string,
  assignmentId?: string,
): Promise<AiExplanationResponse> {
  return sendData<AiExplanationResponse, undefined>(
    explainUrl(submissionId, assignmentId),
    'post',
  )
}
