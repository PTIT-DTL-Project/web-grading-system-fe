import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendMessage } from '../../../shared/api/endpoints/ai'
import type { SendMessageRequest, SendMessageResponse } from '../../../shared/types/aiAgent'

export function useSendMessage(conversationId?: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation<SendMessageResponse, Error, SendMessageRequest>({
    mutationFn: (request: SendMessageRequest) => {
      if (!conversationId) {
        throw new Error('No active conversation')
      }
      return sendMessage(conversationId, request)
    },
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['ai-messages', conversationId] })
      }
    },
  })

  return {
    sendMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  }
}
