import React, { useState, useEffect, useRef } from 'react'
import { Drawer, Empty, Spin } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
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

interface Props {
  open: boolean
  onClose: () => void
}

export const AiChatSidebar: React.FC<Props> = ({ open, onClose }) => {
  const { conversations, isLoading: isConvsLoading, createConversation } = useConversations()
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConvId = selectedConvId ?? (conversations.length > 0 ? conversations[0].id : null)
  const { messages, isLoading: isMsgsLoading, refetch: refetchMessages } = useMessages(activeConvId ?? undefined)
  const { sendMessage, isSending } = useSendMessage(activeConvId ?? undefined)

  const { streamedDelta, activeRun, isStreaming } = useRunEvents(activeRunId, () => {
    setActiveRunId(null)
    refetchMessages()
  })

  // Scroll to bottom when messages or streamed text updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamedDelta])

  const handleSend = async (text: string) => {
    let targetConvId = activeConvId
    if (!targetConvId) {
      const newConv = await createConversation('Hội thoại mới')
      targetConvId = newConv.id
      setSelectedConvId(targetConvId)
    }

    try {
      const res = await sendMessage({
        text,
        clientMessageId: `msg-${Date.now()}`,
      })
      if (res?.runId) {
        setActiveRunId(res.runId)
      }
    } catch {
      // handled by hook
    }
  }

  const handleNewConversation = async () => {
    try {
      const created = await createConversation('Hội thoại mới')
      setSelectedConvId(created.id)
    } catch {
      // ignore
    }
  }

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ color: colors.primary, fontSize: 18 }} />
          <span>Trợ lý AI WGS</span>
        </div>
      }
      placement="right"
      width={420}
      onClose={onClose}
      open={open}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: colors.layoutBg,
        },
      }}
    >
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
            setSelectedConvId(id)
            setActiveRunId(null)
          }}
          onNew={handleNewConversation}
          disabled={isSending || isStreaming}
        />
        <RunStatusBar status={activeRun?.status} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px 16px' }}>
        {isMsgsLoading || isConvsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin tip="Đang tải tin nhắn..." />
          </div>
        ) : messages.length === 0 && !streamedDelta ? (
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

            {streamedDelta && (
              <AssistantMessage content={streamedDelta} isStreaming />
            )}

            {(isSending || (isStreaming && !streamedDelta)) && (
              <StreamingIndicator statusText="AI đang xử lý yêu cầu..." />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput onSend={handleSend} disabled={isSending || isStreaming} loading={isSending} />
    </Drawer>
  )
}
