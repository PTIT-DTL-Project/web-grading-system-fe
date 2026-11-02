import { useState } from 'react'
import { SyncOutlined, BulbOutlined, DownOutlined } from '@ant-design/icons'
import { colors } from '../../../shared/theme/tokens'
import './reasoning-card.css'

interface Props {
  modelTurn: number | null
  text: string
  status: 'RUNNING' | 'COMPLETED'
  available: boolean
  onExpand?: () => void
}

export function ReasoningCard({ modelTurn, text, status, available, onExpand }: Props) {
  const [open, setOpen] = useState(status === 'RUNNING')
  return (
    <section style={{ margin: '0 0 10px 42px', border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.surface }}>
      <button type="button" onClick={() => setOpen(value => {
        if (!value) onExpand?.()
        return !value
      })}
        aria-expanded={open} aria-label={`Suy luận lượt ${modelTurn ?? '?'}`}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: 'transparent', border: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
        <BulbOutlined style={{ color: colors.primary }} />
        <span style={{ flex: 1, fontWeight: 600 }}>Suy luận lượt {modelTurn ?? '?'}</span>
        {status === 'RUNNING' && <SyncOutlined spin aria-label="Đang suy luận" />}
        <DownOutlined style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && <div style={{ padding: '0 10px 10px' }}>
        {available ? <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 320,
          overflowY: 'auto', margin: 0, fontFamily: 'inherit', fontSize: 12, lineHeight: 1.55 }}>
            {text}{status === 'RUNNING' && <span className="reasoning-cursor" aria-hidden="true" />}
          </pre>
          : <span style={{ fontSize: 12, color: colors.neutral }}>
              {status === 'RUNNING' ? 'Đang chờ dữ liệu suy luận...' : 'Reasoning không được provider trả về'}
            </span>}
      </div>}
    </section>
  )
}
