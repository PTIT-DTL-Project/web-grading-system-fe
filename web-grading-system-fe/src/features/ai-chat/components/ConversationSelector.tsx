import React, { useState } from 'react'
import { Select, Button, Modal, Input, message } from 'antd'
import { PlusOutlined, MessageOutlined, EditOutlined } from '@ant-design/icons'
import type { ConversationResponse } from '../../../shared/types/aiAgent'
import { colors } from '../../../shared/theme/tokens'
import { filterOptionByLabel } from '../../../shared/ui/selectSearch'

interface Props {
  conversations: ConversationResponse[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => Promise<unknown>
  disabled?: boolean
}

export const ConversationSelector: React.FC<Props> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  disabled,
}) => {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const activeConversation = conversations.find((c) => c.id === activeId)

  const saveTitle = async () => {
    const trimmed = title.trim()
    if (!activeId || !trimmed || trimmed.length > 255) return
    setSaving(true)
    try {
      await onRename(activeId, trimmed)
      setEditing(false)
    } catch {
      message.error('Không thể đổi tên cuộc trò chuyện')
    } finally {
      setSaving(false)
    }
  }
  // Plain-string labels (not JSX) so typing can filter them; the icon is restored in
  // optionRender below. Conversation titles grow without bound, so the list needs
  // type-to-filter instead of a raw dropdown. Review: 2026-11-12.
  const options = conversations.map((c) => ({
    value: c.id,
    label: c.title || 'Hội thoại mới',
  }))

  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Select
        value={activeId || undefined}
        onChange={onSelect}
        options={options}
        placeholder="Chọn cuộc trò chuyện..."
        disabled={disabled}
        style={{ flex: 1, minWidth: 0 }}
        showSearch
        optionFilterProp="label"
        filterOption={filterOptionByLabel}
        optionRender={(option) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageOutlined style={{ fontSize: 12, color: colors.primary }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {String(option.label ?? '')}
            </span>
          </div>
        )}
      />
      <Button
        icon={<EditOutlined />}
        onClick={() => {
          setTitle(activeConversation?.title ?? '')
          setEditing(true)
        }}
        disabled={disabled || !activeConversation}
        title="Đổi tên cuộc trò chuyện"
        aria-label="Đổi tên cuộc trò chuyện"
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onNew}
        disabled={disabled}
        title="Tạo hội thoại mới"
      >
        Mới
      </Button>
      <Modal
        title="Đổi tên cuộc trò chuyện"
        open={editing}
        onOk={saveTitle}
        onCancel={() => setEditing(false)}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ disabled: !title.trim() || title.trim().length > 255, loading: saving }}
      >
        <Input
          value={title}
          maxLength={255}
          onChange={(event) => setTitle(event.target.value)}
          onPressEnter={saveTitle}
          autoFocus
        />
      </Modal>
    </div>
  )
}
