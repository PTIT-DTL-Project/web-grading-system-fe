import React from 'react'
import { Select, Button, Space } from 'antd'
import { PlusOutlined, MessageOutlined } from '@ant-design/icons'
import type { ConversationResponse } from '../../../shared/types/aiAgent'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  conversations: ConversationResponse[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  disabled?: boolean
}

export const ConversationSelector: React.FC<Props> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  disabled,
}) => {
  const options = conversations.map((c) => ({
    value: c.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageOutlined style={{ fontSize: 12, color: colors.primary }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.title || 'Hội thoại không tên'}
        </span>
      </div>
    ),
  }))

  return (
    <Space orientation="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
      <Select
        value={activeId || undefined}
        onChange={onSelect}
        options={options}
        placeholder="Chọn cuộc trò chuyện..."
        disabled={disabled}
        style={{ flex: 1, minWidth: 240 }}
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
    </Space>
  )
}
