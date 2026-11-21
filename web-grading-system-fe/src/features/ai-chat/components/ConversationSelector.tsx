import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      message.error(t('aiChat.conversationRenameFailed'))
    } finally {
      setSaving(false)
    }
  }
  // Plain-string labels (not JSX) so typing can filter them; the icon is restored in
  // optionRender below. Conversation titles grow without bound, so the list needs
  // type-to-filter instead of a raw dropdown. Review: 2026-11-12.
  const options = conversations.map((c) => ({
    value: c.id,
    // String label (see above) built through i18n so the fallback title is translated too.
    label: c.title || t('aiChat.conversationNew'),
  }))

  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Select
        value={activeId || undefined}
        onChange={onSelect}
        options={options}
        placeholder={t('aiChat.conversationSelectPlaceholder')}
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
        title={t('aiChat.conversationRename')}
        aria-label={t('aiChat.conversationRename')}
      />
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={onNew}
        disabled={disabled}
        title={t('aiChat.conversationNew')}
      >
        {t('aiChat.conversationNewButton')}
      </Button>
      <Modal
        title={t('aiChat.conversationRename')}
        open={editing}
        onOk={saveTitle}
        onCancel={() => setEditing(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
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
