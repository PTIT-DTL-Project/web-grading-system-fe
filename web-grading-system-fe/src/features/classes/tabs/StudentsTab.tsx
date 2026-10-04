"use client"

import { Button, Space, Table, Typography, Upload, message } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { importStudents } from '../../../shared/api/endpoints/classes'
import { useStudents } from '../useStudents'
import type { ClassStudentResponse } from '../../../shared/types/class'
import { useApiErrorMessage } from '../../../shared/api/errors'
import { colors } from '../../../shared/theme/tokens'
import { ErrorState } from '../../../shared/ui/ErrorState'

const SAMPLE_CSV_URL = '/samples/students-import.csv'

interface StudentsTabProps {
  classId: string
  archived?: boolean
  refreshToken?: number
  onSaved?: () => void
}

export function StudentsTab({ classId, archived = false, refreshToken, onSaved }: StudentsTabProps) {
  const { t } = useTranslation()
  const toMessage = useApiErrorMessage()
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const { rows, meta, loading, error, reload } = useStudents(classId, page, PAGE_SIZE)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (refreshToken !== undefined && refreshToken > 0) {
      reload()
    }
  }, [refreshToken, reload])

  const columns = [
    { title: t('students.code'), dataIndex: 'studentCode', key: 'studentCode', ellipsis: true },
    { title: t('students.name'), dataIndex: 'studentName', key: 'studentName', ellipsis: true },
    { title: t('students.email'), dataIndex: 'email', key: 'email', render: (v: string | null) => v || t('common.empty') },
  ]

  const errorMessage = error ? (toMessage(error) as string) : ''
  const hasError = Boolean(error)

   const handleImport = async (file: File) => {
     if (!file) return
      if (!file.name.toLowerCase().endsWith('.csv')) {
       message.error(t('students.importInvalidFile'))
       return
     }
     setUploading(true)
     try {
       const result = await importStudents(classId, file)
       message.success(t('students.importSuccess', { imported: result.imported, skipped: result.skipped }))
       onSaved?.()
       reload()
     } catch (err) {
       message.error(toMessage(err))
     } finally {
       setUploading(false)
     }
   }

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('students.title')}</Typography.Title>
        <Space size={12}>
            <Upload
              accept=".csv"
              showUploadList={false}
              customRequest={() => {}}
              maxCount={1}
              disabled={archived}
              onChange={({ file }) => {
                if (file && file.originFileObj) {
                  handleImport(file.originFileObj)
                }
              }}
            >
             <Button loading={uploading} disabled={archived}>
               {t('students.import')}
             </Button>
           </Upload>
           <a href={SAMPLE_CSV_URL} download="students-import.csv" target="_blank" rel="noreferrer">
             {t('students.downloadTemplate')}
           </a>
        </Space>
      </div>

      {hasError && rows.length === 0 && (
        <ErrorState
          title={t('students.loadFailed')}
          message={errorMessage}
          onRetry={reload}
        />
      )}
      {hasError && rows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ErrorState
            title={t('students.loadFailed')}
            message={errorMessage}
            onRetry={reload}
          />
        </div>
      )}

      {!hasError && rows.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 48, background: colors.surface, borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <Typography.Text type="secondary">{t('students.empty')}</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">{t('students.emptyHint')}</Typography.Text>
          </div>
        </div>
      )}

      {!hasError && rows.length > 0 && (
        <Table<ClassStudentResponse>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{
            current: meta.page + 1,
            pageSize: meta.pageSize,
            total: meta.total,
            showSizeChanger: false,
            showTotal: (total) => t('students.total', { total }),
            onChange: (nextPage) => setPage(nextPage - 1),
          }}
        />
      )}
    </Space>
  )
}
