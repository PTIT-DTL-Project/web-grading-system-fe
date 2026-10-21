import { getData, sendData } from '../http'
import { getSession } from '../../auth/keycloak'
import type {
  ConversationResponse,
  MessageResponse,
  SendMessageRequest,
  SendMessageResponse,
  RunResponse,
} from '../../types/aiAgent'

export function createConversation(title?: string): Promise<ConversationResponse> {
  return sendData<ConversationResponse, { title?: string }>('/api/v1/ai/conversations', 'post', { title })
}

export function listConversations(page = 0, size = 20): Promise<{ content: ConversationResponse[] }> {
  return getData<{ content: ConversationResponse[] }>('/api/v1/ai/conversations', { page, size })
}

export function sendMessage(
  conversationId: string,
  request: SendMessageRequest,
): Promise<SendMessageResponse> {
  return sendData<SendMessageResponse, SendMessageRequest>(
    `/api/v1/ai/conversations/${conversationId}/messages`,
    'post',
    request,
  )
}

export function getMessages(
  conversationId: string,
  page = 0,
  size = 50,
): Promise<{ content: MessageResponse[] }> {
  return getData<{ content: MessageResponse[] }>(
    `/api/v1/ai/conversations/${conversationId}/messages`,
    { page, size },
  )
}

export function getRunStatus(runId: string): Promise<RunResponse> {
  return getData<RunResponse>(`/api/v1/ai/runs/${runId}`)
}

export function cancelRun(runId: string): Promise<void> {
  return sendData<void, undefined>(`/api/v1/ai/runs/${runId}/cancel`, 'post')
}

export function subscribeRunEvents(
  runId: string,
  onMessage: (event: MessageEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const session = getSession()
  const tokenParam = session?.accessToken ? `?token=${encodeURIComponent(session.accessToken)}` : ''
  const eventSource = new EventSource(`/api/v1/ai/runs/${runId}/events${tokenParam}`)
  eventSource.onmessage = onMessage
  if (onError) eventSource.onerror = onError
  return () => eventSource.close()
}
