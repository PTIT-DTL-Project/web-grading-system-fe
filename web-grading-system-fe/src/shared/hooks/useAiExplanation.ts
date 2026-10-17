import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateAiExplanation, getAiExplanation } from '../api/endpoints/aiExplanation'
import type { AiExplanationResponse } from '../types/aiExplanation'

export interface AiExplanationState {
  explanation: AiExplanationResponse | null
  loading: boolean
  error: unknown
  generating: boolean
  generate: () => Promise<AiExplanationResponse>
  retry: () => void
}

/**
 * Read (GET, cached) + generate (POST, LLM) for one submission's explanation.
 *
 * `assignmentId` selects the audience: omitted for a student reading their own
 * submission, set for a lecturer reading one inside their own assignment (the
 * backend checks that ownership against the id). It is not part of the query key
 * — one submission has one explanation whichever route reached it, and a
 * lecturer's generation is cached under the student's id, so the two audiences
 * should share the entry.
 *
 * The GET runs as soon as `enabled` flips true (the page has grading rows, the
 * precondition the POST needs). Generation is user-triggered only — it costs an
 * LLM round-trip, so nothing here fires one on mount.
 */
export function useAiExplanation(
  submissionId: string,
  enabled: boolean,
  assignmentId?: string,
): AiExplanationState {
  const queryClient = useQueryClient()
  const queryKey = ['ai-explanation', submissionId]

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getAiExplanation(submissionId, { signal, assignmentId }),
    enabled: enabled && !!submissionId,
  })

  // Seed the cache from the POST result so the card renders it immediately and
  // the next mount's GET is a hit — never a second network round-trip.
  const mutation = useMutation({
    mutationFn: () => generateAiExplanation(submissionId, assignmentId),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  })

  return {
    explanation: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    generating: mutation.isPending,
    generate: mutation.mutateAsync,
    retry: () => {
      void query.refetch()
    },
  }
}
