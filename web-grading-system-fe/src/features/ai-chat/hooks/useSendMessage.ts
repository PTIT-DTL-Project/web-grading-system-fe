import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendMessage } from '../../../shared/api/endpoints/ai'
import type { SendMessageRequest, SendMessageResponse } from '../../../shared/types/aiAgent'

export function useSendMessage(conversationId?: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation<SendMessageResponse, Error, { request: SendMessageRequest; targetId?: string }>({
    mutationFn: ({ request, targetId }) => {
      const id = targetId ?? conversationId
      if (!id) {
        throw new Error('No active conversation')
      }
      return sendMessage(id, request)
    },
    onSuccess: (_response, variables) => {
      const id = variables.targetId ?? conversationId
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['ai-messages', id] })
      }
    },
  })

  return {
    sendMessage: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  }
}
