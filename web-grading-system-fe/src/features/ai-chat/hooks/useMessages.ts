import { useQuery } from '@tanstack/react-query'
import { getMessages } from '../../../shared/api/endpoints/ai'
import type { MessageResponse } from '../../../shared/types/aiAgent'

export function useMessages(conversationId?: string) {
  const query = useQuery({
    queryKey: ['ai-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return { content: [] }
      const content: MessageResponse[] = []
      for (let page = 0; ; page += 1) {
        const batch = await getMessages(conversationId, page, 100)
        content.push(...batch.content)
        if (batch.content.length < 100) break
      }
      return { content }
    },
    enabled: Boolean(conversationId),
  })

  return {
    messages: query.data?.content ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
