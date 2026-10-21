import React from 'react'
import { Typography, Avatar } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  content: string
  createdAt?: string
  isStreaming?: boolean
}

export const AssistantMessage: React.FC<Props> = ({ content, isStreaming }) => {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
      <Avatar
        size={32}
        icon={<RobotOutlined />}
        style={{
          background: colors.primaryLight,
          color: colors.primary,
          border: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          maxWidth: '82%',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          padding: '10px 14px',
          borderRadius: '16px 16px 16px 4px',
          fontSize: 14,
          lineHeight: '1.6',
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {content}
          {isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 14,
                marginLeft: 4,
                backgroundColor: colors.primary,
                verticalAlign: 'middle',
              }}
            />
          )}
        </Typography.Paragraph>
      </div>
    </div>
  )
}
