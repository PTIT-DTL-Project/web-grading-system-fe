import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Button, Empty, Spin, message, Card } from 'antd'
import { CloseOutlined, RobotOutlined } from '@ant-design/icons'
import { ConversationSelector } from './components/ConversationSelector'
import { RunStatusBar } from './components/RunStatusBar'
import { UserMessage } from './components/UserMessage'
import { AssistantMessage } from './components/AssistantMessage'
import { ToolExecutionCard } from './components/ToolExecutionCard'
import { StreamingIndicator } from './components/StreamingIndicator'
import { ChatInput } from './components/ChatInput'
import { useConversations } from './hooks/useConversations'
import { useMessages } from './hooks/useMessages'
import { useSendMessage } from './hooks/useSendMessage'
import { useRunEvents } from './hooks/useRunEvents'
import { colors } from '../../shared/theme/tokens'
import { listPendingAiActions, confirmAiAction, rejectAiAction } from '../../shared/api/endpoints/ai'
import type { PendingAiAction } from '../../shared/api/endpoints/ai'

interface Props {
  open: boolean
  onClose: () => void
}

export const AiChatSidebar: React.FC<Props> = ({ open, onClose }) => {
  const { conversations, isLoading: isConvsLoading, createConversation, renameConversation, refreshConversations } = useConversations()
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<{ text: string; clientMessageId: string; convId: string | null } | null>(null)
  const [pendingTitleId, setPendingTitleId] = useState<string | null>(null)
  const [pendingActions, setPendingActions] = useState<PendingAiAction[]>([])
  const [busyActionId, setBusyActionId] = useState<string | null>(null)
  const [actionResults, setActionResults] = useState<Array<{ id: string; status: string; result: unknown }>>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const followMessagesRef = useRef(true)

  const activeConvId = selectedConvId ?? (conversations.length > 0 ? conversations[0].id : null)
  const { messages, isLoading: isMsgsLoading, refetch: refetchMessages } = useMessages(activeConvId ?? undefined)
  const { sendMessage, isSending } = useSendMessage(activeConvId ?? undefined)
  const pendingVisible = pendingMessage != null
    && (pendingMessage.convId == null || pendingMessage.convId === activeConvId)
    && !messages.some((m) => m.clientMessageId === pendingMessage.clientMessageId)

  const { streamedDelta, activeRun, isStreaming } = useRunEvents(activeRunId, () => {
    setActiveRunId(null)
    refetchMessages()
    refreshConversations()
  })

  useEffect(() => { setActionResults([]) }, [activeConvId])

  useEffect(() => {
    if (!activeConvId || isStreaming) return
    let cancelled = false
    void listPendingAiActions(activeConvId)
      .then((actions) => { if (!cancelled) setPendingActions(actions) })
      .catch(() => { if (!cancelled) setPendingActions([]) })
    return () => { cancelled = true }
  }, [activeConvId, isStreaming, messages])

  const decideAction = async (id: string, approve: boolean) => {
    setBusyActionId(id)
    try {
      if (approve) {
        const result = await confirmAiAction(id)
        if (result.status === 'COMPLETED') message.success('Đã thực hiện thao tác')
        else message.error(result.result?.message ?? 'Không thể hoàn tất thao tác')
        setActionResults((items) => [...items, { id, status: result.status, result: result.result }])
      } else {
        await rejectAiAction(id)
        message.info('Đã hủy thao tác')
      }
      setPendingActions((actions) => actions.filter((action) => action.pendingActionId !== id))
    } catch {
      message.error('Không thể xử lý yêu cầu duyệt')
    } finally { setBusyActionId(null) }
  }

  // Follow incoming text without restarting a smooth scroll on every stream chunk.
  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    if (open && container && followMessagesRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [open, activeConvId, messages, streamedDelta, pendingMessage, pendingActions, actionResults])

  useEffect(() => {
    if (!pendingTitleId) return
    const interval = window.setInterval(() => { void refreshConversations() }, 2000)
    const timeout = window.setTimeout(() => setPendingTitleId(null), 30000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [pendingTitleId, refreshConversations])

  useEffect(() => {
    if (pendingTitleId && conversations.some((c) => c.id === pendingTitleId && c.title)) {
      setPendingTitleId(null)
    }
  }, [pendingTitleId, conversations])

  const handleSend = async (text: string) => {
    followMessagesRef.current = true
    const clientMessageId = `msg-${crypto.randomUUID()}`
    let targetConvId = activeConvId
    setPendingMessage({ text, clientMessageId, convId: targetConvId })
    try {
      if (!targetConvId) {
        const newConv = await createConversation()
        targetConvId = newConv.id
        setSelectedConvId(targetConvId)
        setPendingMessage({ text, clientMessageId, convId: targetConvId })
      }
      const res = await sendMessage({
        targetId: targetConvId,
        request: { text, clientMessageId },
      })
      if (!conversations.find((c) => c.id === targetConvId)?.title) setPendingTitleId(targetConvId)
      if (res?.runId) {
        setActiveRunId(res.runId)
      }
      void refreshConversations()
    } catch {
      setPendingMessage(null)
      message.error('Không thể gửi tin nhắn. Vui lòng thử lại.')
      throw new Error('Message send failed')
    }
  }

  const handleNewConversation = async () => {
    try {
      const created = await createConversation()
      followMessagesRef.current = true
      setSelectedConvId(created.id)
    } catch {
      // ignore
    }
  }

  if (!open) return null

  return (
    <aside
      className="app-chat-panel"
      aria-label="Trợ lý AI WGS"
      style={{ borderColor: colors.border, background: colors.surface }}
    >
      <div style={{ height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <RobotOutlined style={{ color: colors.primary, fontSize: 18 }} />
          <span>Trợ lý AI WGS</span>
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="Đóng trợ lý AI" />
      </div>
      <div
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.surface,
        }}
      >
        <ConversationSelector
          conversations={conversations}
          activeId={activeConvId}
          onSelect={(id) => {
            followMessagesRef.current = true
            setSelectedConvId(id)
            setActiveRunId(null)
          }}
          onNew={handleNewConversation}
          onRename={(id, title) => renameConversation({ id, title })}
        />
        <RunStatusBar status={activeRun?.status} />
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={(event) => {
          const container = event.currentTarget
          followMessagesRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80
        }}
        style={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 8px 16px', background: colors.layoutBg }}
      >
        {(isMsgsLoading || isConvsLoading) && !pendingVisible ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin tip="Đang tải tin nhắn..." />
          </div>
        ) : messages.length === 0 && !streamedDelta && !pendingVisible && !isSending && !isStreaming ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80%' }}>
            <Empty
              description="Chưa có tin nhắn nào. Hãy đặt câu hỏi hoặc yêu cầu hỗ trợ!"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <>
            {messages.map((m) => {
              if (m.role === 'user') {
                return <UserMessage key={m.id} content={m.content ?? ''} createdAt={m.createdAt} />
              }
              if (m.role === 'tool') {
                return (
                  <ToolExecutionCard
                    key={m.id}
                    toolName={m.toolName ?? 'Tool'}
                    toolArguments={m.toolArguments}
                    toolResult={m.toolResult}
                  />
                )
              }
              return <AssistantMessage key={m.id} content={m.content ?? ''} createdAt={m.createdAt} />
            })}

            {pendingActions.map((action) => (
              <Card key={action.pendingActionId} size="small" title={`Chờ xác nhận: ${action.toolName}`} style={{ marginBottom: 12 }}>
                <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>
                  {JSON.stringify(action.arguments, null, 2)}
                </pre>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="primary" loading={busyActionId === action.pendingActionId}
                    onClick={() => void decideAction(action.pendingActionId, true)}>Xác nhận thực hiện</Button>
                  <Button disabled={busyActionId === action.pendingActionId}
                    onClick={() => void decideAction(action.pendingActionId, false)}>Hủy</Button>
                </div>
              </Card>
            ))}
            {actionResults.map((item) => (
              <Card key={item.id} size="small" title={`Kết quả thao tác: ${item.status}`} style={{ marginBottom: 12 }}>
                <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              </Card>
            ))}

            {pendingVisible && pendingMessage && <UserMessage key={pendingMessage.clientMessageId} content={pendingMessage.text} />}

            {streamedDelta && (
              <AssistantMessage content={streamedDelta} isStreaming />
            )}

            {!streamedDelta && (pendingVisible || isSending || activeRunId || isStreaming) && (
              <StreamingIndicator statusText="AI đang xử lý yêu cầu..." />
            )}

          </>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isSending || Boolean(activeRunId) || isStreaming} loading={isSending} />
    </aside>
  )
}
