import { useTranslation } from 'react-i18next'
import type { TableColumnsType } from 'antd'
import { useCallback } from 'react'
import { listClassRoster } from '../../../shared/api/endpoints/studentClasses'
import type { StudentRoster } from '../../../shared/types/class'
import { ListPage } from '../../../shared/ui/ListPage'

interface StudentRosterTabProps {
  classId: string
}

export function StudentRosterTab({ classId }: StudentRosterTabProps) {
  const { t } = useTranslation()

  const fetcher = useCallback(
    ({ page, size }: { page: number; size: number }) => listClassRoster(classId, page, size),
    [classId],
  )

  const columns: TableColumnsType<StudentRoster> = [
    { title: t('students.code'), dataIndex: 'studentCode', key: 'studentCode', ellipsis: true },
    { title: t('students.name'), dataIndex: 'studentName', key: 'studentName', ellipsis: true },
  ]

  return (
    <ListPage<StudentRoster, Record<string, never>>
      fetcher={fetcher}
      filters={[]}
      initialFilters={{}}
      columns={columns}
      rowKey="studentCode"
      headerTitle={t('students.title')}
      emptyTitle={t('students.empty')}
      emptyHint={t('students.emptyHint')}
      showTotal={(total) => t('students.total', { total })}
    />
  )
}
