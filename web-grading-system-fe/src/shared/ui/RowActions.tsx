import type { ReactNode } from 'react'
import { App, Button, Dropdown } from 'antd'
import { MoreOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

/**
 * One row action. `confirmTitle` turns the action into a modal-confirmed operation:
 * a `Popconfirm` cannot be anchored to an item inside a `Dropdown` menu, so
 * destructive entries confirm through `modal.confirm` instead.
 */
export interface RowAction {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  /** Omit the item entirely (e.g. an action only valid for unpublished rows). */
  hidden?: boolean
  confirmTitle?: string
  confirmDescription?: string
  /** Extra text on the confirm button; defaults to the menu label. */
  confirmOkText?: string
  onClick: () => void
}

function justify(align: 'left' | 'center' | 'right') {
  if (align === 'right') return 'flex-end'
  if (align === 'left') return 'flex-start'
  return 'center'
}

interface RowActionsProps {
  actions: RowAction[]
  /** The row's primary call to action, kept visible next to the "..." trigger. */
  primary?: ReactNode
  disabled?: boolean
  align?: 'left' | 'center' | 'right'
}

/**
 * Table action cell: one visible primary action plus a "..." menu for everything
 * else. Five inline link buttons per row (assignment table) overflowed the column
 * and pushed the table wider than the viewport; a menu keeps the row one line tall.
 * Review: 2026-11-21, user request — actions belong behind a "..." menu, and the
 * trigger is centered in its column: right-aligned it left a wide gap next to the
 * left-aligned "Thao tác" header and looked detached from the row.
 */
export function RowActions({ actions, primary, disabled = false, align = 'center' }: RowActionsProps) {
  const { t } = useTranslation()
  const { modal } = App.useApp()
  const visible = actions.filter((action) => !action.hidden)

  if (visible.length === 0) {
    return primary ? (
      <div style={{ display: 'flex', justifyContent: justify(align) }}>{primary}</div>
    ) : null
  }

  const run = (action: RowAction) => {
    if (!action.confirmTitle) {
      action.onClick()
      return
    }
    modal.confirm({
      title: action.confirmTitle,
      content: action.confirmDescription,
      okText: action.confirmOkText ?? action.label,
      okButtonProps: { danger: action.danger },
      cancelText: t('common.cancel'),
      onOk: action.onClick,
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify(align),
        gap: 8,
        whiteSpace: 'nowrap',
      }}
    >
      {primary}
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items: visible.map((action) => ({
            key: action.key,
            label: action.label,
            icon: action.icon,
            danger: action.danger,
            disabled: action.disabled,
            onClick: () => run(action),
          })),
        }}
      >
        <Button
          type="text"
          size="small"
          disabled={disabled}
          icon={<MoreOutlined />}
          aria-label={t('common.actions')}
          title={t('common.actions')}
        />
      </Dropdown>
    </div>
  )
}
