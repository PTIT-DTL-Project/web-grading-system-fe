import React from 'react'
import { Tag } from 'antd'
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { RunStatus } from '../../../shared/types/aiAgent'

interface Props {
  status?: RunStatus | null
}

export const RunStatusBar: React.FC<Props> = ({ status }) => {
  if (!status) return null

  switch (status) {
    case 'RUNNING':
      return (
        <div style={{ marginTop: 6 }}>
          <Tag icon={<SyncOutlined spin />} color="processing" style={{ fontSize: 11 }}>
            Đang xử lý...
          </Tag>
        </div>
      )
    case 'QUEUED':
      return (
        <div style={{ marginTop: 6 }}>
          <Tag icon={<ClockCircleOutlined />} color="default" style={{ fontSize: 11 }}>
            Đang xếp hàng...
          </Tag>
        </div>
      )
    case 'WAITING_USER':
      return (
        <div style={{ marginTop: 6 }}>
          <Tag color="warning" style={{ fontSize: 11 }}>
            Đang chờ bạn phản hồi...
          </Tag>
        </div>
      )
    case 'FAILED':
      return (
        <div style={{ marginTop: 6 }}>
          <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 11 }}>
            Xử lý thất bại
          </Tag>
        </div>
      )
    case 'SUCCEEDED':
      return (
        <div style={{ marginTop: 6 }}>
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11 }}>
            Hoàn tất
          </Tag>
        </div>
      )
    default:
      return null
  }
}
