import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listConversations, createConversation, updateConversationTitle } from '../../../shared/api/endpoints/ai'

export function useConversations() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => listConversations(0, 30),
  })

  const createMutation = useMutation({
    mutationFn: (title?: string) => createConversation(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateConversationTitle(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  })

  return {
    conversations: query.data?.content ?? [],
    isLoading: query.isLoading,
    createConversation: createMutation.mutateAsync,
    renameConversation: renameMutation.mutateAsync,
    refreshConversations: query.refetch,
  }
}
