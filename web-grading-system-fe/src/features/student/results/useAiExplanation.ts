import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  generateAiExplanation,
  getAiExplanation,
} from '../../../shared/api/endpoints/aiExplanation'
import type { AiExplanationResponse } from '../../../shared/types/aiExplanation'

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
 * The GET runs as soon as `enabled` flips true (the result page has grading rows,
 * the precondition the POST needs). Generation is user-triggered only — it costs
 * an LLM round-trip, and an explanation has exactly one viewer, so there is no
 * shared-cache amortisation to justify generating eagerly.
 */
export function useAiExplanation(
  submissionId: string,
  enabled: boolean,
): AiExplanationState {
  const queryClient = useQueryClient()
  const queryKey = ['ai-explanation', submissionId]

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getAiExplanation(submissionId, { signal }),
    enabled: enabled && !!submissionId,
  })

  // Seed the cache from the POST result so the card renders it immediately and
  // the next mount's GET is a hit — never a second network round-trip.
  const mutation = useMutation({
    mutationFn: () => generateAiExplanation(submissionId),
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
