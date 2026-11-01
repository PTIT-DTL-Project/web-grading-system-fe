import { getData, sendData } from '../http'
import { refreshSession } from '../../auth/keycloak'
import type {
  ConversationResponse,
  MessageResponse,
  SendMessageRequest,
  SendMessageResponse,
  RunResponse,
  RunTimelineEvent,
} from '../../types/aiAgent'

export function createConversation(title?: string): Promise<ConversationResponse> {
  return sendData<ConversationResponse, { title?: string }>('/api/v1/ai/conversations', 'post', { title })
}

export function listConversations(page = 0, size = 20): Promise<{ content: ConversationResponse[] }> {
  return getData<{ content: ConversationResponse[] }>('/api/v1/ai/conversations', { page, size })
}

export function updateConversationTitle(id: string, title: string): Promise<ConversationResponse> {
  return sendData<ConversationResponse, { title: string }>(`/api/v1/ai/conversations/${id}`, 'put', { title })
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
  afterSequence: number,
  onMessage: (event: RunTimelineEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const controller = new AbortController()

  void (async () => {
    try {
      // EventSource cannot send Authorization headers. Fetch keeps the bearer token
      // out of the URL and lets us read the named SSE events from the response body.
      const session = await refreshSession()
      if (controller.signal.aborted) return
      const response = await fetch(`/api/v1/ai/runs/${runId}/events?afterSequence=${afterSequence}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error(`SSE request failed: ${response.status}`)

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      let eventType = 'message'
      let eventId = ''
      let data: string[] = []

      const dispatch = () => {
        if (data.length && eventId) {
          try {
            const event = JSON.parse(data.join('\n')) as RunTimelineEvent
            if (event.version === 1 && event.runId === runId && event.sequence === Number(eventId)
                && event.type === eventType) onMessage(event)
          } catch { /* reconnect from last applied sequence */ }
        }
        eventType = 'message'
        eventId = ''
        data = []
      }
      const fieldValue = (line: string, colon: number) => {
        const value = line.slice(colon + 1)
        return value.startsWith(' ') ? value.slice(1) : value
      }

      while (!controller.signal.aborted) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        let newline: number
        while ((newline = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newline).replace(/\r$/, '')
          buffer = buffer.slice(newline + 1)
          if (!line) dispatch()
          else if (line.startsWith('event:')) eventType = fieldValue(line, 5)
          else if (line.startsWith('id:')) eventId = fieldValue(line, 2)
          else if (line.startsWith('data:')) data.push(fieldValue(line, 4))
        }
      }
      if (buffer) {
        const line = buffer.replace(/\r$/, '')
        if (line.startsWith('data:')) data.push(fieldValue(line, 4))
      }
      dispatch()
      if (!controller.signal.aborted) onError?.(new Event('close'))
    } catch {
      if (!controller.signal.aborted) onError?.(new Event('error'))
    }
  })()

  return () => controller.abort()
}
