import React from 'react'
import { Typography } from 'antd'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  content: string
  createdAt?: string
}

export const UserMessage: React.FC<Props> = ({ content }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, minWidth: 0 }}>
      <div
        style={{
          maxWidth: 'min(88%, 560px)',
          minWidth: 0,
          background: colors.primary,
          color: '#fff',
          padding: '10px 14px',
          borderRadius: '16px 16px 4px 16px',
          fontSize: 14,
          lineHeight: '1.5',
          wordBreak: 'normal',
          overflowWrap: 'break-word',
          boxShadow: '0 2px 6px rgba(200, 16, 46, 0.15)',
        }}
      >
        <Typography.Text style={{ color: '#fff', whiteSpace: 'pre-wrap' }}>{content}</Typography.Text>
      </div>
    </div>
  )
}
