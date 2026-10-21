import { useQuery } from '@tanstack/react-query'
import { getMessages } from '../../../shared/api/endpoints/ai'

export function useMessages(conversationId?: string) {
  const query = useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: () => (conversationId ? getMessages(conversationId, 0, 100) : Promise.resolve({ content: [] })),
    enabled: Boolean(conversationId),
  })

  return {
    messages: query.data?.content ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
