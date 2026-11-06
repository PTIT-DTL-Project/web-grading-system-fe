import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Button } from 'antd'
import { SendOutlined, StopOutlined } from '@ant-design/icons'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  onSend: (text: string) => Promise<void>
  disabled?: boolean
  loading?: boolean
  onStop?: () => Promise<void>
  stopping?: boolean
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled, loading, onStop, stopping }) => {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const sendingRef = useRef(false)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || disabled || loading || sendingRef.current) return
    sendingRef.current = true
    setText('')
    try {
      await onSend(trimmed)
    } catch {
      setText((current) => current || trimmed)
    } finally {
      sendingRef.current = false
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!e.repeat && !e.nativeEvent.isComposing) {
        void handleSend()
      }
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
        style={{ borderRadius: 8, resize: 'none', minWidth: 0 }}
      />
      {onStop ? <Button
        danger
        icon={<StopOutlined />}
        aria-label={t('aiChat.stopRequest')}
        onClick={() => { void onStop() }}
        loading={stopping}
        disabled={stopping}
        style={{ alignSelf: 'flex-end', height: 36 }}
      >{t('aiChat.stop')}</Button> : <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={() => { void handleSend() }}
        loading={loading}
        disabled={disabled || !text.trim()}
        style={{
          background: colors.primary,
          borderColor: colors.primary,
          alignSelf: 'flex-end',
          height: 36,
        }}
      />}
    </div>
  )
}
