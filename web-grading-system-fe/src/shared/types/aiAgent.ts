export type RunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_USER'
  | 'WAITING_APPROVAL'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'LIMIT_REACHED'

export interface ConversationResponse {
  id: string
  ownerId: string
  title: string | null
  activeTaskId: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageResponse {
  id: string
  conversationId: string
  runId: string | null
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string | null
  toolCallId: string | null
  toolName: string | null
  toolArguments: string | null
  toolResult: string | null
  clientMessageId: string | null
  sequenceNo: number
  createdAt: string
}

export interface SendMessageRequest {
  text: string
  clientMessageId?: string
  expectedTaskVersion?: number
}

export interface SendMessageResponse {
  conversationId: string
  runId: string
  messageId: string
}

export interface RunResponse {
  id: string
  conversationId: string
  status: RunStatus
  errorCode?: string | null
  errorMessage?: string | null
  startedAt?: string | null
  finishedAt?: string | null
}
