import React from 'react'
import { Avatar } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { colors } from '../../../shared/theme/tokens'
import './assistant-message.css'

interface Props {
  content: string
  createdAt?: string
  isStreaming?: boolean
}

export const AssistantMessage: React.FC<Props> = ({ content, isStreaming }) => {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start', minWidth: 0 }}>
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
          flex: 1,
          minWidth: 0,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          padding: '10px 14px',
          borderRadius: '16px 16px 16px 4px',
          fontSize: 14,
          lineHeight: '1.6',
          wordBreak: 'normal',
          overflowWrap: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div className="ai-assistant-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
            {content}
          </ReactMarkdown>
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
        </div>
      </div>
    </div>
  )
}
