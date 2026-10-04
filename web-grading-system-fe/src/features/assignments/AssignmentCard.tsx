import { Button, Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import type { AssignmentResponse } from '../../shared/types/assignment'

interface AssignmentCardProps {
  assignment: AssignmentResponse
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onPublish: (id: string) => void
}

export function AssignmentCard({ assignment, onEdit, onDelete, onPublish }: AssignmentCardProps) {
  const { t } = useTranslation()
  const isPublished = assignment.published
  const strategyLabel =
    assignment.gradingStrategy === 'STUDENT_DOCKER_COMPOSE'
      ? 'Student Docker Compose'
      : 'Lecturer Docker Compose'

  return (
    <tr>
      <td>{assignment.title}</td>
      <td>
        <Tag>{strategyLabel}</Tag>
      </td>
      <td>
        {isPublished ? (
          <Tag color="green">{t('assignment.statusPublished')}</Tag>
        ) : (
          <Tag>{t('assignment.statusDraft')}</Tag>
        )}
      </td>
      <td>{assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : '—'}</td>
      <td>
        <Space size={8}>
          <Button type="link" size="small" onClick={() => onEdit(assignment.id)}>
            {t('common.edit')}
          </Button>
          {!isPublished && (
            <Button type="link" size="small" onClick={() => onPublish(assignment.id)}>
              {t('assignment.publish')}
            </Button>
          )}
          <Button type="link" danger size="small" onClick={() => onDelete(assignment.id)}>
            {t('common.delete')}
          </Button>
        </Space>
      </td>
    </tr>
  )
}
