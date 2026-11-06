import React from 'react'
import { useTranslation } from 'react-i18next'
import { Collapse, Tag, Typography } from 'antd'
import { ToolOutlined, CheckCircleOutlined, SyncOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  toolName: string
  toolArguments?: string | null
  toolResult?: string | null
  status?: string
  durationMs?: number | null
  onExpand?: () => void
}

export const ToolExecutionCard: React.FC<Props> = ({
  toolName,
  toolArguments,
  toolResult,
  status = 'COMPLETED',
  durationMs,
  onExpand,
}) => {
  const { t } = useTranslation()
  const isPending = status === 'RUNNING' || status === 'QUEUED'
  const isFailed = status === 'FAILED'

  return (
    <div style={{ marginBottom: 10, marginLeft: 42 }}>
      <Collapse
        size="small"
        onChange={keys => { if (keys.length) onExpand?.() }}
        style={{
          background: colors.layoutBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
        }}
        items={[
          {
            key: '1',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <ToolOutlined style={{ color: colors.primary }} />
                <Typography.Text strong style={{ fontSize: 12 }}>
                  {toolName}
                </Typography.Text>
                <Tag
                  color={isPending ? 'processing' : isFailed ? 'error' : 'success'}
                  icon={isPending ? <SyncOutlined spin /> : isFailed ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                  style={{ marginLeft: 'auto', marginRight: 0 }}
                >
                  {isPending ? t('aiChat.executing') : isFailed ? t('aiChat.failed') : t('aiChat.completed')}
                </Tag>
              </div>
            ),
            children: (
              <div style={{ fontSize: 12 }}>
                {durationMs != null && <Typography.Text type="secondary">{durationMs} ms</Typography.Text>}
                {toolArguments && (
                  <div style={{ marginBottom: 6 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Tham số:
                    </Typography.Text>
                    <pre
                      style={{
                        background: '#fff',
                        padding: 6,
                        borderRadius: 4,
                        maxHeight: 120,
                        overflow: 'auto',
                        border: `1px solid ${colors.border}`,
                        fontSize: 11,
                      }}
                    >
                      {toolArguments}
                    </pre>
                  </div>
                )}
                {toolResult && (
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Kết quả:
                    </Typography.Text>
                    <pre
                      style={{
                        background: '#fff',
                        padding: 6,
                        borderRadius: 4,
                        maxHeight: 150,
                        overflow: 'auto',
                        border: `1px solid ${colors.border}`,
                        fontSize: 11,
                      }}
                    >
                      {toolResult}
                    </pre>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
