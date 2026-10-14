import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAiExplanation, triggerAiExplanation } from '../../../shared/api/endpoints/ai'

export function useAiExplanation(submissionId?: string) {
  const queryClient = useQueryClient()
  const queryKey = ['ai-explanation', submissionId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: ({ signal }) => (submissionId ? getAiExplanation(submissionId, { signal }) : null),
    enabled: !!submissionId,
    staleTime: Infinity,
  })

  const mutation = useMutation({
    mutationFn: () => {
      if (!submissionId) throw new Error('No submission id')
      return triggerAiExplanation(submissionId)
    },
    onSuccess: (newExplanation) => {
      queryClient.setQueryData(queryKey, newExplanation)
    },
  })

  return {
    aiData: data ?? null,
    isLoading,
    isAnalyzing: mutation.isPending,
    hasAnalysis: !!data,
    triggerAnalysis: mutation.mutate,
    error: mutation.error,
  }
}
