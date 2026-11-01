import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Button, Empty, Spin, message } from 'antd'
import { CloseOutlined, RobotOutlined } from '@ant-design/icons'
import { ConversationSelector } from './components/ConversationSelector'
import { RunStatusBar } from './components/RunStatusBar'
import { UserMessage } from './components/UserMessage'
import { AssistantMessage } from './components/AssistantMessage'
import { ToolExecutionCard } from './components/ToolExecutionCard'
import { ReasoningCard } from './components/ReasoningCard'
import { StreamingIndicator } from './components/StreamingIndicator'
import { ChatInput } from './components/ChatInput'
import { useConversations } from './hooks/useConversations'
import { useMessages } from './hooks/useMessages'
import { useSendMessage } from './hooks/useSendMessage'
import { useRunEvents } from './hooks/useRunEvents'
import { getRunStatus } from '../../shared/api/endpoints/ai'
import { colors } from '../../shared/theme/tokens'

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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const followMessagesRef = useRef(true)

  const activeConvId = selectedConvId ?? (conversations.length > 0 ? conversations[0].id : null)
  const { messages, isLoading: isMsgsLoading, refetch: refetchMessages } = useMessages(activeConvId ?? undefined)
  const { sendMessage, isSending } = useSendMessage(activeConvId ?? undefined)
  const pendingVisible = pendingMessage != null
    && (pendingMessage.convId == null || pendingMessage.convId === activeConvId)
    && !messages.some((m) => m.clientMessageId === pendingMessage.clientMessageId)

  const historyRunIds = [...new Set(messages.map(m => m.runId).filter((id): id is string => Boolean(id)))]
  const { streamedDelta, timelines, loadedRunIds, activeRun, isStreaming } = useRunEvents(activeRunId, historyRunIds, () => {
    setActiveRunId(null)
    refetchMessages()
    refreshConversations()
  })

  useEffect(() => {
    if (!activeConvId || activeRunId || isMsgsLoading) return
    const latest = [...messages].reverse().find(m => m.role === 'user' && m.runId)?.runId
    if (!latest) return
    let cancelled = false
    void getRunStatus(latest).then(run => {
      if (!cancelled && ['QUEUED', 'RUNNING', 'WAITING_USER', 'WAITING_APPROVAL'].includes(run.status)) {
        setActiveRunId(latest)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [activeConvId, activeRunId, isMsgsLoading, messages])

  const renderTimeline = (runId: string) => (timelines[runId]?.items ?? []).map(item =>
    item.kind === 'reasoning'
      ? <ReasoningCard key={item.id} modelTurn={item.modelTurn} text={item.text}
          status={item.status} available={item.available} onExpand={() => { followMessagesRef.current = false }} />
      : <ToolExecutionCard key={item.id} toolName={item.name} toolArguments={item.arguments}
          toolResult={item.result} status={item.status} durationMs={item.durationMs}
          onExpand={() => { followMessagesRef.current = false }} />,
  )

  // Follow incoming text without restarting a smooth scroll on every stream chunk.
  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    if (open && container && followMessagesRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [open, activeConvId, messages, streamedDelta, pendingMessage, timelines])

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
                return <React.Fragment key={m.id}>
                  <UserMessage content={m.content ?? ''} createdAt={m.createdAt} />
                  {m.runId && renderTimeline(m.runId)}
                  {m.runId && loadedRunIds[m.runId] && !timelines[m.runId]?.hasTimeline &&
                    <div style={{ margin: '0 0 10px 42px', color: colors.neutral, fontSize: 12 }}>
                      Không có lịch sử suy luận chi tiết cho lượt chạy cũ.
                    </div>}
                </React.Fragment>
              }
              if (m.role === 'tool') {
                if (m.runId && timelines[m.runId]?.hasTimeline) return null
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

            {pendingVisible && pendingMessage && <React.Fragment key={pendingMessage.clientMessageId}>
              <UserMessage content={pendingMessage.text} />
              {activeRunId && renderTimeline(activeRunId)}
            </React.Fragment>}

            {activeRunId && !pendingVisible && !messages.some(m => m.runId === activeRunId && m.role === 'user') && renderTimeline(activeRunId)}

            {streamedDelta && !messages.some(m => m.runId === activeRunId && m.role === 'assistant') && (
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
