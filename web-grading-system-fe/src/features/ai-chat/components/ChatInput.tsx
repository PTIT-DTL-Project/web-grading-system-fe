import React, { useState } from 'react'
import { Input, Button } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  loading?: boolean
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled, loading }) => {
  const [text, setText] = useState('')

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled || loading) return
    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: 12,
        borderTop: `1px solid ${colors.border}`,
        background: colors.surface,
      }}
    >
      <Input.TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
        autoSize={{ minRows: 1, maxRows: 4 }}
        disabled={disabled || loading}
        style={{ borderRadius: 8, resize: 'none' }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSend}
        loading={loading}
        disabled={disabled || !text.trim()}
        style={{
          background: colors.primary,
          borderColor: colors.primary,
          alignSelf: 'flex-end',
          height: 36,
        }}
      />
    </div>
  )
}
