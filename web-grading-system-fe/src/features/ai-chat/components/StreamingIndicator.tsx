import React from 'react'
import { Typography, Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { colors } from '../../../shared/theme/tokens'

interface Props {
  statusText?: string
}

export const StreamingIndicator: React.FC<Props> = ({ statusText = 'AI đang suy nghĩ và thực thi...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        marginBottom: 10,
        marginLeft: 42,
        borderRadius: 16,
        background: colors.primaryLight,
        width: 'fit-content',
      }}
    >
      <Spin indicator={<LoadingOutlined style={{ fontSize: 14, color: colors.primary }} spin />} />
      <Typography.Text style={{ fontSize: 12, color: colors.primary }}>
        {statusText}
      </Typography.Text>
    </div>
  )
}
